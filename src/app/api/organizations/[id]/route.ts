import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { organizationUpdateSchema } from "@/lib/schemas";
import { writeAudit } from "@/lib/audit";
import { onboardingMissingFields } from "@/lib/onboarding";
import { databaseFailureResponse } from "@/lib/api-errors";
import type { Prisma } from "@prisma/client";

class IncompleteOnboardingError extends Error {}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await getOrganization(params); }
  catch (cause) { const response=databaseFailureResponse(cause); if(response) return response; throw cause; }
}

async function getOrganization(params: Promise<{ id: string }>) {
  const user = await getSessionUser(); const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "organization:view"))) return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  const organization = await db.organization.findUnique({ where: { id, deletedAt: null }, include: { profile: true, legalDetails: true, addresses: true, contacts: true, accountingSettings: true, fiscalYears: true, bankAccounts: { where: { deletedAt: null } }, documents: { where: { deletedAt: null }, include: { fileAsset: true } }, memberships: { where: { deletedAt: null }, include: { user: { select: { id: true, displayName: true, email: true } } } }, companyEngagements: { include: { office: true } }, officeEngagements: { include: { company: true } }, auditEvents: { orderBy: { createdAt: "desc" }, take: 20 } } });
  return organization ? NextResponse.json(organization) : NextResponse.json({ error: "غير موجود." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await updateOrganization(request, params); }
  catch (cause) { const response=databaseFailureResponse(cause); if(response) return response; throw cause; }
}

async function updateOrganization(request: Request, params: Promise<{ id: string }>) {
  const user = await getSessionUser(); const { id } = await params;
  if (!user || !(await authorizeOrganization(user.id, id, "organization:edit"))) return NextResponse.json({ error: "غير مصرح بالتعديل." }, { status: 403 });
  const parsed = organizationUpdateSchema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400 });
  const { profile, legal, address, contacts, accounting, fiscalYear, ...base } = parsed.data;
  const current = await db.organization.findUnique({ where: { id } });
  if (!current || current.deletedAt) return NextResponse.json({ error: "غير موجود." }, { status: 404 });
  if (current.type !== "COMMERCIAL_COMPANY" && (accounting || fiscalYear)) return NextResponse.json({ error: "الإعدادات المحاسبية والسنة المالية مخصصة للشركات." }, { status: 400 });
  try {
    await db.$transaction(async tx => {
      const organizationData: Prisma.OrganizationUpdateInput = {};
      if (base.legalName !== undefined) organizationData.legalName = base.legalName;
      if (base.tradeName !== undefined) organizationData.tradeName = base.tradeName;
      if (base.englishName !== undefined) organizationData.englishName = base.englishName;
      if (base.onboardingStatus !== undefined) organizationData.onboardingStatus = base.onboardingStatus;
      if (Object.keys(organizationData).length) await tx.organization.update({ where: { id }, data: organizationData });
      if (profile) await tx.organizationProfile.upsert({ where: { organizationId: id }, create: { organizationId: id, ...profile }, update: profile });
      if (legal) await tx.companyLegalDetails.upsert({ where: { organizationId: id }, create: { organizationId: id, ...legal }, update: legal });
      if (address) await tx.organizationAddress.upsert({ where: { organizationId_type: { organizationId: id, type: "LEGAL" } }, create: { organizationId: id, type: "LEGAL", ...address }, update: address });
      if (contacts) {
        const contactTypes = contacts.length ? contacts.map(contact => contact.type) : ["FINANCE_MANAGER", "ACCOUNTING_CONTACT"];
        await tx.companyContact.deleteMany({ where: { organizationId: id, type: { in: contactTypes } } });
        const replacements = contacts.flatMap(contact => {
          if ("remove" in contact) return [];
          return [{ organizationId: id, ...contact }];
        });
        if (replacements.length) await tx.companyContact.createMany({ data: replacements });
      }
      if (accounting) await tx.companyAccountingSettings.upsert({ where: { organizationId: id }, create: { organizationId: id, ...accounting }, update: accounting });
      if (fiscalYear) {
        if (fiscalYear.id) {
          const result = await tx.companyFiscalYear.updateMany({ where: { id: fiscalYear.id, organizationId: id, isClosed: false }, data: { name: fiscalYear.name, startsAt: fiscalYear.startsAt, endsAt: fiscalYear.endsAt } });
          if (!result.count) throw new Error("السنة المالية غير موجودة أو مغلقة.");
        } else {
          await tx.companyFiscalYear.upsert({ where: { organizationId_startsAt_endsAt: { organizationId: id, startsAt: fiscalYear.startsAt, endsAt: fiscalYear.endsAt } }, create: { organizationId: id, name: fiscalYear.name, startsAt: fiscalYear.startsAt, endsAt: fiscalYear.endsAt }, update: { name: fiscalYear.name } });
        }
      }
      if (base.onboardingStatus === "COMPLETE") {
        const snapshot = await tx.organization.findUniqueOrThrow({ where: { id }, include: { profile: true, legalDetails: true, addresses: true, accountingSettings: true, fiscalYears: true, bankAccounts: { where: { deletedAt: null, isActive: true } } } });
        const missing = onboardingMissingFields(snapshot);
        if (missing.length) throw new IncompleteOnboardingError(`لا يمكن اعتماد الملف قبل استكمال: ${missing.join("، ")}`);
      }
    });
  } catch (cause) {
    if (cause instanceof IncompleteOnboardingError) return NextResponse.json({ error: cause.message }, { status: 400 });
    if (cause instanceof Error && cause.message.startsWith("السنة المالية")) return NextResponse.json({ error: cause.message }, { status: 400 });
    throw cause;
  }
  await writeAudit({ organizationId: id, actorUserId: user.id, action: "ORGANIZATION_UPDATED", entityType: "Organization", entityId: id, request });
  return NextResponse.json({ ok: true });
}
