export type ControlCategory = "BANKING" | "ACCOUNTING" | "RECEIVABLES" | "PAYABLES" | "EXPENSE" | "FIXED_ASSET" | "INVENTORY" | "FINANCIAL_CLOSE";
export type ControlSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
export type ControlResultStatus = "PASSED" | "FINDING" | "INSUFFICIENT_DATA" | "NOT_APPLICABLE" | "EXECUTION_ERROR" | "DISABLED";
export type FindingStatus = "DETECTED" | "ASSIGNED" | "UNDER_INVESTIGATION" | "CORRECTION_PROPOSED" | "PENDING_APPROVAL" | "APPROVED" | "REVALIDATION" | "RESOLVED" | "FALSE_POSITIVE" | "RISK_ACCEPTED" | "REOPENED" | "REJECTED" | "ESCALATED";

export interface ControlRule {
  id: string;
  version: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: ControlCategory;
  severity: ControlSeverity;
  requiredData: string[];
  thresholdMinor?: number;
  recommendedActionAr: string;
  recommendedActionEn: string;
  configurableParameters: Record<string, string | number | boolean>;
  enabled: boolean;
  implementation: "EXECUTABLE" | "INSUFFICIENT_DATA" | "PLANNED";
}

export interface ControlEvidence {
  id: string;
  kind: "SOURCE_RECORD" | "JOURNAL" | "DOCUMENT" | "ACCOUNT" | "PERIOD" | "CALCULATION";
  referenceId: string;
  label: string;
  details: Record<string, string | number | boolean>;
}

export interface ControlResult {
  id: string;
  ruleId: string;
  ruleVersion: string;
  status: ControlResultStatus;
  explanation: string;
  evidence: ControlEvidence[];
  findingId?: string;
  durationMs: number;
}

export interface FinancialControlRun {
  id: string;
  organizationId: string;
  snapshotId: string;
  startedAt: string;
  completedAt: string;
  status: "COMPLETED" | "FAILED";
  results: ControlResult[];
}

export interface FindingHistoryItem {
  id: string;
  at: string;
  actor: string;
  fromStatus?: FindingStatus;
  toStatus: FindingStatus;
  reason: string;
}

export interface ControlFinding {
  id: string;
  organizationId: string;
  snapshotId: string;
  ruleId: string;
  ruleVersion: string;
  relatedTransactionIds: string[];
  relatedDocumentIds: string[];
  amountUnderReviewMinor: number;
  currency: "EGP" | "USD";
  severity: ControlSeverity;
  explanation: string;
  evidence: ControlEvidence[];
  recommendedAction: string;
  assignedUserId?: string;
  assignedUserName?: string;
  status: FindingStatus;
  createdAt: string;
  lastCheckedAt: string;
  dueDate?: string;
  comments: Array<{ id: string; author: string; body: string; at: string }>;
  history: FindingHistoryItem[];
  duplicateFingerprint: string;
  correctionJournalId?: string;
  resolutionReason?: string;
  revalidationResult?: ControlResultStatus;
}

