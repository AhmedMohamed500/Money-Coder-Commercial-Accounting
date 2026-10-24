import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { DocumentValidationError, validateDeclaredDocument } from "@/lib/document-files";
import { createDocumentUploadTicket, UploadTicketError, verifyDocumentUploadTicket } from "@/lib/document-upload";
import { organizationHasDocumentCapacity } from "@/lib/document-storage-policy";
import { assertOrganizationObjectKey, cleanupAbandonedUploads, getStorageAdapter, StorageOperationError } from "@/lib/storage";

const inputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  kind: z.enum(["LOGO", "LEGAL_DOCUMENT", "TAX_DOCUMENT", "OTHER"]),
  originalName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
});

const noStore = { "cache-control": "no-store" };

function safeFailure(cause: unknown) {
  if (cause instanceof DocumentValidationError || cause instanceof UploadTicketError) return NextResponse.json({ error: cause.message }, { status: 400, headers: noStore });
  if (cause instanceof StorageOperationError) {
    const status = cause.code === "quota" ? 507 : cause.code === "conflict" ? 409 : 503;
    return NextResponse.json({ error: status === 507 ? "سعة التخزين غير كافية." : "التخزين الآمن غير متاح مؤقتًا." }, { status, headers: noStore });
  }
  return NextResponse.json({ error: "تعذر بدء الرفع الآمن." }, { status: 400, headers: noStore });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "documents:manage"))) return NextResponse.json({ error: "غير مصرح." }, { status: 403, headers: noStore });
  if (!checkRateLimit(`document-upload:${user.id}:${clientIp(request)}`, 20, 15 * 60_000).allowed) return NextResponse.json({ error: "محاولات رفع كثيرة. حاول لاحقًا." }, { status: 429, headers: noStore });
  try {
    const parsed = inputSchema.parse(await request.json());
    const declared = validateDeclaredDocument(parsed);
    if (!(await organizationHasDocumentCapacity(id, declared.sizeBytes))) return NextResponse.json({ error: "تم الوصول إلى حد مستندات الشركة أو سعة التخزين." }, { status: 507, headers: noStore });

    const adapter = getStorageAdapter();
    const availability = await adapter.availability();
    if (!availability.available) throw new StorageOperationError(availability.state === "misconfigured" ? "misconfigured" : "unavailable", true);
    await cleanupAbandonedUploads(id).catch(cause => console.error("document orphan cleanup failed", cause instanceof Error ? cause.name : "unknown"));

    const { token, payload } = createDocumentUploadTicket({ organizationId: id, userId: user.id, originalName: declared.originalName, mimeType: declared.mimeType, sizeBytes: declared.sizeBytes, kind: parsed.kind, title: parsed.title });
    assertOrganizationObjectKey(payload.pendingKey, id);
    assertOrganizationObjectKey(payload.finalKey, id);
    const metadata = { organizationId: id, uploadedById: user.id, uploadId: payload.jti, declaredMime: payload.mimeType, declaredSize: String(payload.sizeBytes) };
    if (await adapter.headObject(payload.pendingKey) || await adapter.headObject(payload.finalKey)) throw new StorageOperationError("conflict");
    const upload = await adapter.createUploadTarget(payload.pendingKey, payload.mimeType, metadata, payload.expiresAt - payload.issuedAt);
    if (adapter.provider !== "neon") upload.headers["x-money-coder-upload-token"] = token;
    return NextResponse.json({ token, upload, expiresAt: new Date(payload.expiresAt * 1_000).toISOString() }, { headers: noStore });
  } catch (cause) {
    return safeFailure(cause);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "documents:manage"))) return NextResponse.json({ error: "غير مصرح." }, { status: 403, headers: noStore });
  try {
    const { token } = z.object({ token: z.string().min(1).max(4_096) }).parse(await request.json());
    const { payload } = verifyDocumentUploadTicket(token, { allowExpired: true });
    if (payload.organizationId !== id || payload.userId !== user.id) throw new UploadTicketError("invalid");
    assertOrganizationObjectKey(payload.pendingKey, id);
    await getStorageAdapter().deleteObject(payload.pendingKey);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (cause) {
    if (cause instanceof UploadTicketError) return NextResponse.json({ error: "تصريح الرفع غير صالح." }, { status: 400, headers: noStore });
    return NextResponse.json({ error: "تعذر إلغاء الرفع الآن." }, { status: 503, headers: noStore });
  }
}
