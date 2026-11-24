import { buildAccountBalances } from "@/application/demo/reporting";
import type { AgentToolCall, AgentType } from "@/domain/agents/types";
import type { DemoState } from "@/domain/demo/types";

export type DemoAgentToolName = "read_finding_evidence" | "read_snapshot_summary" | "read_account_balances" | "read_journal_workflow";

const permissions: Record<AgentType, DemoAgentToolName[]> = {
  BANK_AGENT: ["read_finding_evidence", "read_snapshot_summary", "read_journal_workflow"],
  ACCOUNTING_AGENT: ["read_finding_evidence", "read_snapshot_summary", "read_account_balances", "read_journal_workflow"],
  RECEIVABLES_AGENT: ["read_finding_evidence", "read_snapshot_summary", "read_account_balances"],
  EXPENSE_AGENT: ["read_finding_evidence", "read_snapshot_summary", "read_account_balances"],
  FINANCIAL_CLOSE_AGENT: ["read_finding_evidence", "read_snapshot_summary", "read_account_balances", "read_journal_workflow"],
  CFO_AGENT: ["read_finding_evidence", "read_snapshot_summary", "read_account_balances", "read_journal_workflow"],
};

export function executeAgentTool(state: DemoState, organizationId: string, findingId: string, agentType: AgentType, tool: DemoAgentToolName): AgentToolCall {
  const id = `tool-${findingId}-${tool}`;
  if (!permissions[agentType].includes(tool)) return { id, tool, inputSummary: "طلب قراءة مقيد", outputSummary: "تم رفض الأداة وفق صلاحيات الوكيل.", status: "DENIED", permission: `${agentType}:${tool}`, durationMs: 0 };
  const finding = state.findings.find(item => item.id === findingId && item.organizationId === organizationId);
  if (!finding) throw new Error("الملاحظة الرقابية لا تخص الشركة الحالية.");
  const snapshot = state.financialSnapshots.find(item => item.id === finding.snapshotId && item.organizationId === organizationId);
  if (!snapshot) throw new Error("Snapshot الأدلة غير موجودة للشركة الحالية.");
  const summary = tool === "read_finding_evidence"
    ? `${finding.evidence.length} دليل مرتبط بقاعدة ${finding.ruleId}`
    : tool === "read_snapshot_summary"
      ? `Snapshot v${snapshot.version}: ${snapshot.totals.records} سجل`
      : tool === "read_account_balances"
        ? `${buildAccountBalances(state, organizationId).filter(item => item.account.postingAllowed).length} حساب ترحيل`
        : `${state.journals.filter(item => item.organizationId === organizationId).length} قيد ضمن مسار العمل`;
  return { id, tool, inputSummary: `الشركة ${organizationId} / الملاحظة ${findingId}`, outputSummary: summary, status: "COMPLETED", permission: `${agentType}:${tool}`, durationMs: 1 };
}
