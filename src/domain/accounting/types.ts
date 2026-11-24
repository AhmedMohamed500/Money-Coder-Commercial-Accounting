export type AccountClass = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type FinancialStatementGroup = "CURRENT_ASSET" | "NON_CURRENT_ASSET" | "CURRENT_LIABILITY" | "NON_CURRENT_LIABILITY" | "EQUITY" | "REVENUE" | "COST_OF_SALES" | "OPERATING_EXPENSE";
export type JournalWorkflowStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "CORRECTION_REQUESTED" | "REJECTED" | "REVERSED";
export type JournalSource = "OPENING" | "MANUAL" | "BANK_DEMO" | "CONTROL_CORRECTION" | "REVERSAL";
export type FinancialPeriodStatus = "OPEN" | "CLOSED";

export interface FinancialPeriod {
  id: string;
  organizationId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: FinancialPeriodStatus;
  lockedAt?: string;
  lockedBy?: string;
  reopeningRequiresApproval: boolean;
}

export interface AccountingPermissionSet {
  view: boolean;
  create: boolean;
  edit: boolean;
  review: boolean;
  approve: boolean;
  post: boolean;
  reverse: boolean;
}

