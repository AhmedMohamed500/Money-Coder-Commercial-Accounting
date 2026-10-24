import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { assertOrganizationObjectKey, getStorageAdapter, StorageOperationError } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

const privateHeaders = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };

export async function GET(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getSessionUser();
  const { documentId } = await params;
  const doc = await db.companyDocument.findFirst({ where: { id: documentId, deletedAt: null, fileAsset: { deletedAt: null } }, include: { fileAsset: true } });
  if (!user || !doc || !(await authorizeOrganization(user.id, doc.organizationId, "documents:view"))) return NextResponse.json({ error: "غير موجود أو غير مصرح." }, { status: 404, headers: privateHeaders });
  try {
    assertOrganizationObjectKey(doc.fileAsset.storageKey, doc.organizationId);
    const adapter = getStorageAdapter(doc.fileAsset.storageProvider);
    if (!(await adapter.headObject(doc.fileAsset.storageKey))) throw new StorageOperationError("not-found");
    const signedUrl = await adapter.createDownloadUrl(doc.fileAsset.storageKey, doc.fileAsset.originalName, doc.fileAsset.mimeType, 60);
    if (signedUrl) {
      await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_DOWNLOADED", entityType: "CompanyDocument", entityId: doc.id, request });
      return new NextResponse(null, { status: 303, headers: { ...privateHeaders, location: signedUrl } });
    }
    const stored = await adapter.readObject(doc.fileAsset.storageKey);
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
    await getStorageAdapter(doc.fileAsset.storageProvider).deleteObject(doc.fileAsset.storageKey);
    await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_DELETED", entityType: "CompanyDocument", entityId: doc.id, request });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    await writeAudit({ organizationId: doc.organizationId, actorUserId: user.id, action: "DOCUMENT_PHYSICAL_DELETE_PENDING", entityType: "CompanyDocument", entityId: doc.id, metadata: { retryable: true }, request }).catch(() => undefined);
    return NextResponse.json({ error: "تم إخفاء المستند، وحذف النسخة المخزنة قيد إعادة المحاولة.", physicalDeletionPending: true }, { status: 503, headers: privateHeaders });
  }
}
