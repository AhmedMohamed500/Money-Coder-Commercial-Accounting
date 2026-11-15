import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { assertOrganizationObjectKey, getStorageAdapter, StorageOperationError } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";
import { documentHash, documentIsClean, queueStorageDeletion } from "@/lib/document-gateway";

const privateHeaders = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };

export async function GET(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getSessionUser();
  const { documentId } = await params;
  const doc = await db.companyDocument.findFirst({ where: { id: documentId, deletedAt: null, fileAsset: { deletedAt: null } }, include: { fileAsset: true } });
  if (!user || !doc || !(await authorizeOrganization(user.id, doc.organizationId, "documents:view"))) return NextResponse.json({ error: "غير موجود أو غير مصرح." }, { status: 404, headers: privateHeaders });
  if (!documentIsClean(doc.fileAsset) || !doc.fileAsset.releaseKey) return NextResponse.json({ error: "المستند غير متاح حتى اكتمال الفحص الأمني." }, { status: 423, headers: privateHeaders });
  try {
    assertOrganizationObjectKey(doc.fileAsset.releaseKey, doc.organizationId);
    const adapter = getStorageAdapter(doc.fileAsset.storageProvider);
    const head = await adapter.headObject(doc.fileAsset.releaseKey);
    if (!head || head.sizeBytes !== doc.fileAsset.sizeBytes || head.contentType !== doc.fileAsset.mimeType) throw new StorageOperationError("invalid-object");
    const stored = await adapter.readObject(doc.fileAsset.releaseKey);
    if (stored.bytes.length !== doc.fileAsset.sizeBytes || stored.contentType !== doc.fileAsset.mimeType || documentHash(stored.bytes) !== doc.fileAsset.scannedSha256) throw new StorageOperationError("invalid-object");
    await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_DOWNLOADED", entityType: "CompanyDocument", entityId: doc.id, request });
    return new NextResponse(new Uint8Array(stored.bytes), { headers: { ...privateHeaders, "content-type": doc.fileAsset.mimeType, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileAsset.originalName)}` } });
  } catch {
    return NextResponse.json({ error: "ملف التخزين غير متاح." }, { status: 503, headers: privateHeaders });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getSessionUser();
  const { documentId } = await params;
  const doc = await db.companyDocument.findUnique({ where: { id: documentId }, include: { fileAsset: true } });
  if (!user || !doc || !(await authorizeOrganization(user.id, doc.organizationId, "documents:manage"))) return NextResponse.json({ error: "غير موجود أو غير مصرح." }, { status: 404, headers: privateHeaders });
  assertOrganizationObjectKey(doc.fileAsset.storageKey, doc.organizationId);
  if (doc.fileAsset.releaseKey) assertOrganizationObjectKey(doc.fileAsset.releaseKey, doc.organizationId);
  if (!doc.deletedAt || !doc.fileAsset.deletedAt) {
    const deletedAt = new Date();
    await db.$transaction(async tx => {
      await tx.organizationProfile.updateMany({ where: { organizationId: doc.organizationId, logoFileId: doc.fileAssetId }, data: { logoFileId: null } });
      await tx.companyDocument.updateMany({ where: { id: doc.id, deletedAt: null }, data: { deletedAt } });
      await tx.fileAsset.updateMany({ where: { id: doc.fileAssetId, deletedAt: null }, data: { deletedAt } });
      await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_DELETE_REQUESTED", entityType: "CompanyDocument", entityId: doc.id, request, client: tx });
    });
  }
  try {
    const results = await Promise.all([doc.fileAsset.storageKey, doc.fileAsset.releaseKey].filter((key): key is string => Boolean(key)).map(key => queueStorageDeletion(doc.organizationId, key, doc.fileAsset.storageProvider)));
    if (results.some(done => !done)) throw new StorageOperationError("delete-pending", true);
    await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_DELETED", entityType: "CompanyDocument", entityId: doc.id, request });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_PHYSICAL_DELETE_PENDING", entityType: "CompanyDocument", entityId: doc.id, metadata: { retryable: true }, request }).catch(() => undefined);
    return NextResponse.json({ error: "تم إخفاء المستند، وحذف النسخة المخزنة قيد إعادة المحاولة.", physicalDeletionPending: true }, { status: 503, headers: privateHeaders });
  }
}
