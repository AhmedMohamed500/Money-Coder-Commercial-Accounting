import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { organizationUpdateSchema } from "@/lib/schemas";
import { writeAudit } from "@/lib/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(); const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "organization:view"))) return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  const organization = await db.organization.findUnique({ where: { id, deletedAt: null }, include: { profile: true, legalDetails: true, addresses: true, contacts: true, accountingSettings: true, fiscalYears: true, bankAccounts: { where: { deletedAt: null } }, documents: { where: { deletedAt: null }, include: { fileAsset: true } }, memberships: { where: { deletedAt: null }, include: { user: { select: { id: true, displayName: true, email: true } } } }, companyEngagements: { include: { office: true } }, officeEngagements: { include: { company: true } }, auditEvents: { orderBy: { createdAt: "desc" }, take: 20 } } });
  return organization ? NextResponse.json(organization) : NextResponse.json({ error: "غير موجود." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(); const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "organization:edit"))) return NextResponse.json({ error: "غير مصرح بالتعديل." }, { status: 403 });
  const parsed = organizationUpdateSchema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400 });
  const { profile, legal, address, contacts, accounting, ...base } = parsed.data;
  const current = await db.organization.findUnique({ where: { id } });
  if (!current || current.deletedAt) return NextResponse.json({ error: "غير موجود." }, { status: 404 });
  if (current.type !== "COMMERCIAL_COMPANY" && accounting) return NextResponse.json({ error: "إعدادات المحاسبة مخصصة للشركات." }, { status: 400 });
  await db.$transaction(async tx => {
    await tx.organization.update({ where: { id }, data: { ...base, tradeName: base.tradeName || null, englishName: base.englishName || null } });
    if (profile) await tx.organizationProfile.upsert({ where: { organizationId: id }, create: { organizationId: id, ...profile, website: profile.website || null, publicEmail: profile.publicEmail || null }, update: { ...profile, website: profile.website || null, publicEmail: profile.publicEmail || null } });
    if (legal) await tx.companyLegalDetails.upsert({ where: { organizationId: id }, create: { organizationId: id, ...legal }, update: legal });
    if (address) await tx.organizationAddress.upsert({ where: { organizationId_type: { organizationId: id, type: "LEGAL" } }, create: { organizationId: id, type: "LEGAL", ...address }, update: address });
    if (contacts) { await tx.companyContact.deleteMany({ where: { organizationId: id } }); if (contacts.length) await tx.companyContact.createMany({ data: contacts.map(contact => ({ organizationId: id, ...contact, email: contact.email || null })) }); }
    if (accounting) await tx.companyAccountingSettings.upsert({ where: { organizationId: id }, create: { organizationId: id, ...accounting }, update: accounting });
  });
  await writeAudit({ organizationId: id, actorUserId: user.id, action: "ORGANIZATION_UPDATED", entityType: "Organization", entityId: id, request });
  return NextResponse.json({ ok: true });
}
