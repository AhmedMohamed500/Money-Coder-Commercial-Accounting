type OnboardingSnapshot = {
  type: "ACCOUNTING_OFFICE" | "COMMERCIAL_COMPANY";
  legalName: string;
  profile: { responsiblePerson: string | null; businessActivity: string | null; phone: string | null; publicEmail: string | null } | null;
  legalDetails: { commercialRegisterNo: string | null; taxRegistrationNo: string | null } | null;
  addresses: Array<{ addressLine: string; countryCode: string }>;
  accountingSettings: unknown | null;
  fiscalYears: unknown[];
  bankAccounts: unknown[];
};

export function onboardingMissingFields(organization: OnboardingSnapshot) {
  const missing: string[] = [];
  if (!organization.legalName.trim()) missing.push("الاسم القانوني");
  if (!organization.profile?.responsiblePerson?.trim()) missing.push("اسم المسؤول");
  if (!organization.addresses.some((address) => address.addressLine.trim() && address.countryCode.trim())) missing.push("العنوان القانوني");

  if (organization.type === "ACCOUNTING_OFFICE") {
    if (!organization.profile?.phone?.trim() && !organization.profile?.publicEmail?.trim()) missing.push("هاتف أو بريد المكتب");
    return missing;
  }

  if (!organization.profile?.businessActivity?.trim()) missing.push("نوع النشاط");
  if (!organization.legalDetails?.commercialRegisterNo?.trim()) missing.push("رقم السجل التجاري");
  if (!organization.legalDetails?.taxRegistrationNo?.trim()) missing.push("رقم التسجيل الضريبي");
  if (!organization.accountingSettings) missing.push("الإعداد المحاسبي");
  if (!organization.fiscalYears.length) missing.push("السنة المالية");
  if (!organization.bankAccounts.length) missing.push("حساب بنكي واحد على الأقل");
  return missing;
}
