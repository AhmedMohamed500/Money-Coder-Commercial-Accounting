import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { CompanyWorkspace } from "@/components/company-workspace";
import { StatusPill } from "@/components/dashboard-shell";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";
import { privateStorageUploadPolicy } from "@/lib/config";
import { db } from "@/lib/db";
import { privateStorageAvailability } from "@/lib/storage";

export default async function CompanySettingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const context = await loadCompanyContext(user.id, id);
  if (!context) notFound();
  const organization = await db.organization.findFirst({
    where: { id, type: "COMMERCIAL_COMPANY", deletedAt: null },
    include: {
      profile: true, legalDetails: true, addresses: true, contacts: true, accountingSettings: true,
      fiscalYears: { orderBy: { startsAt: "desc" } },
      bankAccounts: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      documents: { where: { deletedAt: null }, include: { fileAsset: true }, orderBy: { createdAt: "desc" } },
      companyEngagements: { include: { office: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!organization) notFound();
  const [canEdit, canDocuments, canEngagements, storage] = await Promise.all([
    authorizeOrganization(user.id, id, "organization:edit"),
    authorizeOrganization(user.id, id, "documents:manage"),
    authorizeOrganization(user.id, id, "engagements:manage"),
    privateStorageAvailability(),
  ]);
  const requestedStep = Number((await searchParams).step ?? 0);
  const initialStep = Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= 5 ? requestedStep : 0;
  return <CompanyShell organizationId={id} companyName={organization.tradeName || organization.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canAudit={context.canAudit} canManageTeam={context.canManageTeam}>
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><Link href={`/company/${id}`} className="text-sm font-bold text-teal-700 underline">العودة إلى لوحة الشركة</Link><h1 className="mt-2 text-3xl font-black">إعدادات الشركة</h1><p className="mt-2 text-sm text-slate-600">البيانات الأساسية والقانونية والمحاسبية والبنوك والمستندات. تُحفظ كل خطوة بصورة مستقلة.</p></div><StatusPill complete={organization.onboardingStatus === "COMPLETE"}/></div>
    <CompanyWorkspace key={initialStep} organization={organization} canEdit={Boolean(canEdit)} canDocuments={Boolean(canDocuments)} canEngagements={Boolean(canEngagements)} storageReady={storage.available} uploadMode={privateStorageUploadPolicy().mode} initialStep={initialStep}/>
  </CompanyShell>;
}
