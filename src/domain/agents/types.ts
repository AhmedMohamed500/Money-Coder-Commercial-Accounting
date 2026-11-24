export type AgentType = "BANK_AGENT" | "ACCOUNTING_AGENT" | "RECEIVABLES_AGENT" | "EXPENSE_AGENT" | "FINANCIAL_CLOSE_AGENT" | "CFO_AGENT";
export type AgentRunStatus = "IDLE" | "PLANNING" | "RUNNING" | "WAITING_FOR_APPROVAL" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface AgentToolCall {
  id: string;
  tool: string;
  inputSummary: string;
  outputSummary: string;
  status: "COMPLETED" | "FAILED" | "DENIED";
  permission: string;
  durationMs: number;
}

export interface AgentRun {
  id: string;
  organizationId: string;
  findingId?: string;
  agentType: AgentType;
  status: AgentRunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  toolCalls: AgentToolCall[];
  output: string;
  evidenceReferences: string[];
  limitations: string[];
  error?: string;
  usagePreview: { operations: number; externalTokens: 0; estimatedCost: "0.00" };
}

export interface MockAgentResponse {
  output: string;
  evidenceReferences: string[];
  toolCalls: AgentToolCall[];
  limitations: string[];
}

