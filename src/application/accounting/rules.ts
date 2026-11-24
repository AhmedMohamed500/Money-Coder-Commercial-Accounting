import type { AccountingPermissionSet, FinancialPeriod } from "@/domain/accounting/types";
import type { Account, DemoRole, DemoState, JournalEntry, JournalLine, OrganizationId } from "@/domain/demo/types";

const permissions: Record<DemoRole, AccountingPermissionSet> = {
  COMPANY_OWNER: { view: true, create: false, edit: false, review: true, approve: true, post: false, reverse: false },
  COMPANY_ACCOUNTANT: { view: true, create: true, edit: true, review: true, approve: false, post: true, reverse: false },
  SENIOR_ACCOUNTANT: { view: true, create: true, edit: true, review: true, approve: true, post: true, reverse: true },
  FINANCE_MANAGER: { view: true, create: true, edit: true, review: true, approve: true, post: true, reverse: true },
  REVIEWER: { view: true, create: false, edit: false, review: true, approve: false, post: false, reverse: false },
  OFFICE_OWNER: { view: true, create: false, edit: false, review: true, approve: true, post: false, reverse: false },
  OFFICE_ACCOUNTANT: { view: true, create: true, edit: true, review: true, approve: false, post: true, reverse: false },
};

export function accountingPermissionsFor(role: DemoRole): AccountingPermissionSet {
  return permissions[role];
}

export function assertPermission(role: DemoRole, permission: keyof AccountingPermissionSet) {
  if (!permissions[role][permission]) throw new Error("الدور التجريبي الحالي لا يملك هذه الصلاحية المحاسبية.");
}

export function assertValidJournalLines(lines: JournalLine[]) {
  if (lines.length < 2) throw new Error("يجب أن يحتوي القيد على سطرين على الأقل.");
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.debitMinor) || !Number.isSafeInteger(line.creditMinor)) throw new Error("القيم المالية تجاوزت حدود الدقة الآمنة للعرض.");
    if (line.debitMinor < 0 || line.creditMinor < 0) throw new Error("لا تقبل أسطر القيد قيمًا سالبة.");
    if (line.debitMinor > 0 && line.creditMinor > 0) throw new Error("لا يمكن أن يكون السطر مدينًا ودائنًا في الوقت نفسه.");
    if (line.debitMinor === 0 && line.creditMinor === 0) throw new Error("لا يمكن ترحيل سطر عديم القيمة.");
    debit += line.debitMinor;
    credit += line.creditMinor;
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) throw new Error("إجمالي القيد تجاوز حدود الدقة الآمنة للعرض.");
  }
  if (debit !== credit) throw new Error("القيد غير متوازن. يجب تساوي إجمالي المدين والدائن.");
  if (debit <= 0) throw new Error("لا يمكن إنشاء قيد عديم القيمة.");
}

export function assertPostingAccounts(state: DemoState, organizationId: OrganizationId, lines: JournalLine[]) {
  for (const line of lines) {
    const account = state.accounts.find(item => item.id === line.accountId && item.organizationId === organizationId);
    if (!account) throw new Error("أحد الحسابات لا يخص الشركة الحالية.");
    if (!account.active) throw new Error(`الحساب ${account.code} غير نشط.`);
    if (!account.postingAllowed) throw new Error(`الحساب ${account.code} تجميعي ولا يقبل الترحيل.`);
  }
}

export function financialPeriodForDate(state: DemoState, organizationId: OrganizationId, date: string): FinancialPeriod {
  const period = state.financialPeriods.find(item => item.organizationId === organizationId && date >= item.startsAt && date <= item.endsAt);
  if (!period) throw new Error("لا توجد فترة مالية تغطي تاريخ القيد.");
  return period;
}

export function assertOpenPeriod(state: DemoState, organizationId: OrganizationId, date: string): FinancialPeriod {
  const period = financialPeriodForDate(state, organizationId, date);
  if (period.status !== "OPEN") throw new Error(`الفترة المالية ${period.name} مقفلة ولا تقبل الترحيل.`);
  return period;
}

export function assertUniqueJournalReference(state: DemoState, organizationId: OrganizationId, reference: string, excludingId?: string) {
  if (state.journals.some(entry => entry.organizationId === organizationId && entry.id !== excludingId && entry.reference.toLocaleLowerCase() === reference.toLocaleLowerCase())) {
    throw new Error("مرجع القيد مستخدم بالفعل داخل هذه الشركة.");
  }
}

export function canApproveEntry(entry: JournalEntry, role: DemoRole) {
  return permissions[role].approve && entry.createdByRole !== role;
}

export function isLedgerEntry(entry: JournalEntry) {
  return entry.status === "POSTED" || entry.status === "REVERSED";
}

export function naturalSignedBalance(account: Account, debitMinor: number, creditMinor: number) {
  return account.normalBalance === "DEBIT" ? debitMinor - creditMinor : creditMinor - debitMinor;
}

