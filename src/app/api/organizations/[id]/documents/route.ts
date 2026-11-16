import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { DocumentValidationError, validateStoredDocument } from "@/lib/document-files";
import { UploadTicketError, verifyDocumentUploadTicket } from "@/lib/document-upload";
import { organizationHasDocumentCapacity } from "@/lib/document-storage-policy";
import { assertOrganizationObjectKey, getStorageAdapter, StorageOperationError, type StorageObjectMetadata } from "@/lib/storage";
import { privateStorageUploadMode } from "@/lib/config";
import { checkDocumentRateLimit, queueStorageDeletion } from "@/lib/document-gateway";

const noStore = { "cache-control": "no-store" };
const finalizeSchema = z.object({ token: z.string().min(1).max(4_096) });
function expectedMetadata(payload: ReturnType<typeof verifyDocumentUploadTicket>["payload"]): StorageObjectMetadata {
  return { organizationId: payload.organizationId, uploadedById: payload.userId, uploadId: payload.jti, declaredMime: payload.mimeType, declaredSize: String(payload.sizeBytes) };
}
function metadataMatches(actual: StorageObjectMetadata, expected: StorageObjectMetadata) {
  return Object.keys(expected).every(key => actual[key as keyof StorageObjectMetadata] === expected[key as keyof StorageObjectMetadata]);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "documents:manage"))) return NextResponse.json({ error: "غير مصرح." }, { status: 403, headers: noStore });
  if (privateStorageUploadMode() === "disabled") return NextResponse.json({ error: "إنهاء رفع المستندات معطّل حاليًا." }, { status: 503, headers: noStore });
  let claimed: { id: string; token: string; pendingKey: string; provider: string } | undefined;
  try {
    if (!(await checkDocumentRateLimit(`finalize:${id}:${user.id}`, 40, 15 * 60_000))) return NextResponse.json({ error: "محاولات كثيرة. حاول لاحقًا." }, { status: 429, headers: noStore });
    const { token } = finalizeSchema.parse(await request.json());
    const { payload, expired } = verifyDocumentUploadTicket(token, { allowExpired: true });
    if (payload.organizationId !== id || payload.userId !== user.id) throw new UploadTicketError("invalid");
    assertOrganizationObjectKey(payload.pendingKey, id);
    assertOrganizationObjectKey(payload.finalKey, id);
    const intent = await db.documentUploadIntent.findUnique({ where: { id: payload.jti } });
    if (!intent || intent.organizationId !== id || intent.userId !== user.id || intent.pendingKey !== payload.pendingKey || intent.releaseKey !== payload.finalKey || intent.expiresAt.getTime() !== payload.expiresAt * 1_000) throw new UploadTicketError("invalid");
    if (intent.status !== "PENDING_UPLOAD") return NextResponse.json({ error: "تم استخدام هذا التصريح أو إلغاؤه." }, { status: 409, headers: noStore });
    const adapter = getStorageAdapter();
    if (expired || intent.expiresAt <= new Date()) {
      const changed = await db.documentUploadIntent.updateMany({ where: { id: intent.id, status: "PENDING_UPLOAD" }, data: { status: "EXPIRED" } });
      if (changed.count) await queueStorageDeletion(id, payload.pendingKey, adapter.provider);
      return NextResponse.json({ error: "انتهت صلاحية تصريح الرفع. ابدأ الرفع من جديد." }, { status: 410, headers: noStore });
    }
    const claimToken = randomUUID();
    const claim = await db.documentUploadIntent.updateMany({ where: { id: intent.id, status: "PENDING_UPLOAD" }, data: { status: "FINALIZING", claimToken, claimExpiresAt: new Date(Date.now() + 60_000) } });
    if (claim.count !== 1) return NextResponse.json({ error: "هذا التصريح قيد الإنهاء أو استُخدم بالفعل." }, { status: 409, headers: noStore });
    claimed = { id: intent.id, token: claimToken, pendingKey: payload.pendingKey, provider: adapter.provider };
    const expected = expectedMetadata(payload);
    const head = await adapter.headObject(payload.pendingKey);
    if (!head || head.sizeBytes !== payload.sizeBytes || head.contentType !== payload.mimeType || !metadataMatches(head.metadata, expected)) throw new DocumentValidationError("بيانات الملف المرفوع لا تطابق التصريح.");
    const stored = await adapter.readObject(payload.pendingKey);
    if (stored.sizeBytes !== payload.sizeBytes || stored.bytes.length !== payload.sizeBytes || stored.contentType !== payload.mimeType || !metadataMatches(stored.metadata, expected)) throw new DocumentValidationError("بيانات الملف المرفوع لا تطابق التصريح.");
    const verifiedFile = validateStoredDocument(stored.bytes, payload.mimeType, payload.originalName);
    if (verifiedFile.sha256 !== payload.sha256) throw new DocumentValidationError("بصمة الملف لا تطابق تصريح الرفع.");
    if (!(await organizationHasDocumentCapacity(id, verifiedFile.sizeBytes))) throw new StorageOperationError("quota");
    const document = await db.$transaction(async tx => {
      if (!(await organizationHasDocumentCapacity(id, verifiedFile.sizeBytes, tx))) throw new StorageOperationError("quota");
      const updated = await tx.documentUploadIntent.updateMany({ where: { id: payload.jti, status: "FINALIZING", claimToken, claimExpiresAt: { gt: new Date() } }, data: { status: "PENDING_SCAN", claimToken: null, claimExpiresAt: null } });
      if (updated.count !== 1) throw new UploadTicketError("invalid");
      const asset = await tx.fileAsset.create({ data: { organizationId: id, uploadedById: user.id, kind: payload.kind, originalName: verifiedFile.originalName, storageKey: payload.pendingKey, releaseKey: payload.finalKey, mimeType: verifiedFile.mimeType, sizeBytes: verifiedFile.sizeBytes, sha256: verifiedFile.sha256, storageProvider: adapter.provider, scanStatus: "PENDING_SCAN" } });
      const created = await tx.companyDocument.create({ data: { organizationId: id, fileAssetId: asset.id, category: payload.kind, title: payload.title } });
      await tx.documentUploadIntent.update({ where: { id: payload.jti }, data: { fileAssetId: asset.id } });
      await writeAudit({ organizationId: id, actorUserId: user.id, action: "DOCUMENT_QUARANTINED", entityType: "CompanyDocument", entityId: created.id, metadata: { kind: payload.kind, sizeBytes: verifiedFile.sizeBytes, sha256: verifiedFile.sha256 }, request, client: tx });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    claimed = undefined;
    return NextResponse.json(document, { status: 201, headers: noStore });
  } catch (cause) {
    if (claimed) {
      const failed = await db.documentUploadIntent.updateMany({ where: { id: claimed.id, status: "FINALIZING", claimToken: claimed.token }, data: { status: "FAILED", claimToken: null, claimExpiresAt: null } }).catch(() => ({ count: 0 }));
      if (failed.count) await queueStorageDeletion(id, claimed.pendingKey, claimed.provider).catch(() => undefined);
    }
    if (cause instanceof UploadTicketError || cause instanceof DocumentValidationError || cause instanceof z.ZodError) return NextResponse.json({ error: cause instanceof z.ZodError ? "طلب الإنهاء غير صالح." : cause.message }, { status: 400, headers: noStore });
    if (cause instanceof StorageOperationError) return NextResponse.json({ error: cause.code === "quota" ? "سعة التخزين غير كافية." : "التخزين الآمن غير متاح مؤقتًا." }, { status: cause.code === "quota" ? 507 : 503, headers: noStore });
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2034") return NextResponse.json({ error: "تزامن رفع المستندات. حاول مرة أخرى." }, { status: 409, headers: noStore });
    console.error("document finalize failed", cause instanceof Error ? cause.name : "unknown");
    return NextResponse.json({ error: "تعذر حفظ بيانات المستند." }, { status: 500, headers: noStore });
  }
}
