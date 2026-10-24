import { NextResponse } from "next/server";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { verifyDocumentUploadTicket } from "@/lib/document-upload";
import { assertOrganizationObjectKey, getStorageAdapter } from "@/lib/storage";

const noStore = { "cache-control": "no-store" };

export async function PUT(request: Request) {
  const adapter = getStorageAdapter();
  if (adapter.provider === "neon" || process.env.NODE_ENV === "production") return NextResponse.json({ error: "غير متاح." }, { status: 404, headers: noStore });
  const token = request.headers.get("x-money-coder-upload-token") ?? "";
  try {
    const user = await getSessionUser();
    const { payload } = verifyDocumentUploadTicket(token);
    if (!user || user.id !== payload.userId || !(await authorizeOrganization(user.id, payload.organizationId, "documents:manage"))) return NextResponse.json({ error: "غير مصرح." }, { status: 403, headers: noStore });
    assertOrganizationObjectKey(payload.pendingKey, payload.organizationId);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== payload.mimeType) return NextResponse.json({ error: "نوع المحتوى لا يطابق التصريح." }, { status: 400, headers: noStore });
    const contentLength = request.headers.get("content-length");
    const declaredLength = contentLength === null ? null : Number(contentLength);
    if (declaredLength !== null && (!Number.isFinite(declaredLength) || declaredLength !== payload.sizeBytes)) return NextResponse.json({ error: "حجم المحتوى لا يطابق التصريح." }, { status: 400, headers: noStore });
    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.length !== payload.sizeBytes) return NextResponse.json({ error: "حجم المحتوى لا يطابق التصريح." }, { status: 400, headers: noStore });
    await adapter.putObject(payload.pendingKey, bytes, payload.mimeType, { organizationId: payload.organizationId, uploadedById: user.id, uploadId: payload.jti, declaredMime: payload.mimeType, declaredSize: String(payload.sizeBytes) });
    return new NextResponse(null, { status: 204, headers: noStore });
  } catch {
    return NextResponse.json({ error: "تعذر استقبال الملف." }, { status: 400, headers: noStore });
  }
}
