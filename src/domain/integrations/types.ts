import type { FinancialSourceType } from "@/domain/financial-twin/types";

export type IntegrationStatus = "DEMO_AVAILABLE" | "SIMULATION" | "NOT_CONNECTED" | "PLANNED" | "SYNC_ERROR";

export interface DemoIntegration {
  id: string;
  sourceType: FinancialSourceType | "N8N";
  name: string;
  status: IntegrationStatus;
  description: string;
  lastDemoSyncAt?: string;
  mappingTemplateCount: number;
  credentialMode: "NONE" | "MOCK_ONLY";
}

export interface UsageMeteringPreview {
  billingPeriod: string;
  companies: number;
  users: number;
  importedTransactions: number;
  controlExecutions: number;
  agentRuns: number;
  documentProcessing: number;
  storageBytes: number;
}

