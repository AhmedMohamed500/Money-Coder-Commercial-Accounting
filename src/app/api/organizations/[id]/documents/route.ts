import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { DocumentValidationError, validateStoredDocument } from "@/lib/document-files";
import { UploadTicketError, verifyDocumentUploadTicket } from "@/lib/document-upload";
import { organizationHasDocumentCapacity } from "@/lib/document-storage-policy";
import { assertOrganizationObjectKey, getStorageAdapter, StorageOperationError, type StorageObjectMetadata } from "@/lib/storage";

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

  let pendingKey: string | undefined;
  let finalKey: string | undefined;
  let promoted = false;
  try {
    const { token } = finalizeSchema.parse(await request.json());
    const verified = verifyDocumentUploadTicket(token, { allowExpired: true });
    const { payload } = verified;
    if (payload.organizationId !== id || payload.userId !== user.id) throw new UploadTicketError("invalid");
    pendingKey = payload.pendingKey;
    finalKey = payload.finalKey;
    assertOrganizationObjectKey(pendingKey, id);
    assertOrganizationObjectKey(finalKey, id);
    const adapter = getStorageAdapter();
    if (verified.expired) {
      await adapter.deleteObject(pendingKey).catch(() => undefined);
      return NextResponse.json({ error: "انتهت صلاحية تصريح الرفع. ابدأ الرفع من جديد." }, { status: 410, headers: noStore });
    }
    if (await db.fileAsset.findUnique({ where: { storageKey: finalKey }, select: { id: true } })) return NextResponse.json({ error: "تم إنهاء هذا الرفع من قبل." }, { status: 409, headers: noStore });

    const expected = expectedMetadata(payload);
    const head = await adapter.headObject(pendingKey);
    if (!head) return NextResponse.json({ error: "لم يتم العثور على الملف المرفوع." }, { status: 400, headers: noStore });
    if (head.sizeBytes !== payload.sizeBytes || head.contentType !== payload.mimeType || !metadataMatches(head.metadata, expected)) {
      await adapter.deleteObject(pendingKey).catch(() => undefined);
      return NextResponse.json({ error: "بيانات الملف المرفوع لا تطابق التصريح." }, { status: 400, headers: noStore });
    }
    const stored = await adapter.readObject(pendingKey);
    if (stored.sizeBytes !== payload.sizeBytes || stored.bytes.length !== payload.sizeBytes || stored.contentType !== payload.mimeType || !metadataMatches(stored.metadata, expected)) throw new DocumentValidationError("بيانات الملف المرفوع لا تطابق التصريح.");
    const verifiedFile = validateStoredDocument(stored.bytes, payload.mimeType, payload.originalName);
    if (!(await organizationHasDocumentCapacity(id, verifiedFile.sizeBytes))) return NextResponse.json({ error: "تم الوصول إلى حد مستندات الشركة أو سعة التخزين." }, { status: 507, headers: noStore });

    await adapter.promoteObject(pendingKey, finalKey, verifiedFile.mimeType, expected);
    promoted = true;
    const document = await db.$transaction(async tx => {
      const asset = await tx.fileAsset.create({ data: { organizationId: id, uploadedById: user.id, kind: payload.kind, originalName: verifiedFile.originalName, storageKey: finalKey!, mimeType: verifiedFile.mimeType, sizeBytes: verifiedFile.sizeBytes, sha256: verifiedFile.sha256, storageProvider: adapter.provider } });
      const created = await tx.companyDocument.create({ data: { organizationId: id, fileAssetId: asset.id, category: payload.kind, title: payload.title } });
      if (payload.kind === "LOGO") await tx.organizationProfile.upsert({ where: { organizationId: id }, create: { organizationId: id, logoFileId: asset.id }, update: { logoFileId: asset.id } });
      await writeAudit({ organizationId: id, actorUserId: user.id, action: "DOCUMENT_UPLOADED", entityType: "CompanyDocument", entityId: created.id, metadata: { kind: payload.kind, sizeBytes: verifiedFile.sizeBytes, sha256: verifiedFile.sha256 }, request, client: tx });
      return created;
    });
    await adapter.deleteObject(pendingKey).catch(cause => console.error("pending document cleanup failed", cause instanceof Error ? cause.name : "unknown"));
    return NextResponse.json(document, { status: 201, headers: noStore });
  } catch (cause) {
    if (cause instanceof DocumentValidationError && pendingKey) await getStorageAdapter().deleteObject(pendingKey).catch(() => undefined);
    if (promoted && finalKey) {
      const adapter = getStorageAdapter();
      await Promise.all([adapter.deleteObject(finalKey).catch(() => undefined), pendingKey ? adapter.deleteObject(pendingKey).catch(() => undefined) : Promise.resolve()]);
    }
    if (cause instanceof UploadTicketError || cause instanceof DocumentValidationError || cause instanceof z.ZodError) return NextResponse.json({ error: cause instanceof z.ZodError ? "طلب الإنهاء غير صالح." : cause.message }, { status: 400, headers: noStore });
    if (cause instanceof StorageOperationError) {
      const status = cause.code === "conflict" ? 409 : cause.code === "quota" ? 507 : 503;
      return NextResponse.json({ error: status === 409 ? "تم استخدام هذا التصريح أو تعارض الملف." : status === 507 ? "سعة التخزين غير كافية." : "التخزين الآمن غير متاح مؤقتًا." }, { status, headers: noStore });
    }
    console.error("document finalize failed", cause instanceof Error ? cause.name : "unknown");
    return NextResponse.json({ error: "تعذر حفظ بيانات المستند. لم يتم الاحتفاظ بالملف." }, { status: 500, headers: noStore });
  }
}
