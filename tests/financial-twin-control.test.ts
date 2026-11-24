import { describe, expect, it, vi } from "vitest";
import { guardianMetrics } from "@/application/control-engine/selectors";
import { calculateDataQuality } from "@/application/financial-twin/import-engine";
import { InMemoryDemoAdapter } from "@/data/adapters/demo/in-memory-demo-adapter";
import { suggestedAccountMappings } from "@/integrations/demo/synthetic-financial-sources";
import { toolsForAgent } from "@/application/agents/tool-registry";
import type { FinancialSourceType } from "@/domain/financial-twin/types";

async function buildControlledSnapshot(adapter: InMemoryDemoAdapter, source: FinancialSourceType = "EXCEL") {
  const batchId = await adapter.loadSyntheticImport(source);
  await adapter.applyImportMappings(batchId, suggestedAccountMappings("org-nile"));
  await adapter.validateImportBatch(batchId);
  const snapshotId = await adapter.confirmImportBatch(batchId);
  await adapter.runControlSnapshot(snapshotId);
  return { batchId, snapshotId };
}

describe("Financial Twin and deterministic control workflow", () => {
  it("keeps raw evidence, normalized data, validation errors and an immutable snapshot linked", async () => {
    const adapter = new InMemoryDemoAdapter();
    const { batchId, snapshotId } = await buildControlledSnapshot(adapter);
    const state = adapter.snapshot();
    const batch = state.importBatches.find(item => item.id === batchId)!;
    const snapshot = state.financialSnapshots.find(item => item.id === snapshotId)!;
    const transactions = state.normalizedTransactions.filter(item => item.batchId === batchId);
    const quality = calculateDataQuality(batch, state.rawFinancialRecords.filter(item => item.batchId === batchId), transactions);

    expect(batch).toMatchObject({ status: "CONFIRMED", acceptedRows: 8, rejectedRows: 8, duplicateRows: 4 });
    expect(snapshot.recordIds).toHaveLength(8);
    expect(snapshot.dataCoverage).toEqual({ accepted: 8, rejected: 8, total: 16 });
    expect(snapshot.totals.debitMinor - snapshot.totals.creditMinor).toBe(50_000);
    expect(quality.duplicateRecords).toBe(4);
    expect(quality.unmappedAccounts).toBe(1);
    expect(quality.missingReferences).toBe(2);
    expect(state.rawFinancialRecords.find(item => item.batchId === batchId)?.values).toHaveProperty("transaction_id");
    await expect(adapter.applyImportMappings(batchId, {})).rejects.toThrow(/مؤكدة/);
    await expect(adapter.confirmImportBatch(batchId)).rejects.toThrow();
    expect(adapter.snapshot().financialSnapshots).toEqual([snapshot]);
  });

  it("creates evidence-linked findings without double-counting the same exposure", async () => {
    const adapter = new InMemoryDemoAdapter();
    const { snapshotId } = await buildControlledSnapshot(adapter);
    const state = adapter.snapshot();
    const findings = state.findings.filter(item => item.snapshotId === snapshotId);
    const ruleIds = new Set(findings.map(item => item.ruleId));
    expect(new Set(findings.map(item => item.id)).size).toBe(findings.length);
    expect([...ruleIds]).toEqual(expect.arrayContaining(["BNK-001", "BNK-003", "BNK-004", "ACC-001", "ACC-002", "ACC-004", "ACC-005"]));
    expect(findings.every(item => item.evidence.length > 0)).toBe(true);
    for (const finding of findings) {
      for (const evidence of finding.evidence.filter(item => item.kind === "SOURCE_RECORD")) {
        const record = state.normalizedTransactions.find(item => item.id === evidence.referenceId);
        expect(record?.batchId).toBe(state.financialSnapshots[0].batchId);
        expect(state.rawFinancialRecords.some(item => item.batchId === record?.batchId && item.sourceRecordId === record.sourceRecordId)).toBe(true);
      }
    }
    expect(state.controlRuns[0].results.some(item => item.status === "INSUFFICIENT_DATA")).toBe(true);
    const metrics = guardianMetrics(state, "org-nile");
    const uniqueExposure = [...new Map(findings.map(item => [item.duplicateFingerprint, item.amountUnderReviewMinor])).values()].reduce((sum, value) => sum + value, 0);
    expect(metrics.amountUnderReviewMinor).toBe(uniqueExposure);
  });

  it("uses a mock agent with real local tool calls and never auto-posts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const adapter = new InMemoryDemoAdapter();
    await buildControlledSnapshot(adapter);
    const finding = adapter.snapshot().findings.find(item => item.ruleId === "BNK-001")!;
    const journalCount = adapter.snapshot().journals.length;
    await adapter.runMockAgent(finding.id, "BANK_AGENT");
    const run = adapter.snapshot().agentRuns[0];
    expect(run.status).toBe("COMPLETED");
    expect(run.toolCalls.some(item => item.status === "COMPLETED")).toBe(true);
    expect(run.toolCalls.map(item => item.tool)).toEqual(toolsForAgent("BANK_AGENT"));
    expect(run.evidenceReferences).toEqual(finding.evidence.map(item => item.referenceId));
    expect(run.usagePreview).toMatchObject({ externalTokens: 0, estimatedCost: "0.00" });
    expect(adapter.snapshot().journals).toHaveLength(journalCount);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("requires human submission, approval and posting before revalidation resolves a finding", async () => {
    const adapter = new InMemoryDemoAdapter();
    await buildControlledSnapshot(adapter);
    const finding = adapter.snapshot().findings.find(item => item.ruleId === "BNK-001")!;
    const journalId = await adapter.proposeFindingCorrection(finding.id);
    expect(adapter.snapshot().journals.find(item => item.id === journalId)).toMatchObject({ status: "DRAFT", createdByRole: "AI_SIMULATION" });

    await adapter.switchRole("COMPANY_ACCOUNTANT");
    await adapter.submitJournal(journalId);
    await expect(adapter.postJournal(journalId)).rejects.toThrow(/اعتماد/);
    await adapter.switchRole("FINANCE_MANAGER");
    await adapter.approveJournal(journalId);
    await adapter.switchRole("SENIOR_ACCOUNTANT");
    await adapter.postJournal(journalId);
    expect(adapter.snapshot().findings.find(item => item.id === finding.id)?.status).toBe("REVALIDATION");
    await adapter.revalidateFinding(finding.id);
    expect(adapter.snapshot().findings.find(item => item.id === finding.id)).toMatchObject({ status: "RESOLVED", revalidationResult: "PASSED" });
    expect(guardianMetrics(adapter.snapshot(), "org-nile").verifiedRecoveryMinor).toBe(0);
    await adapter.reverseJournal(journalId, "اختبار عكس التصحيح");
    await adapter.runControlSnapshot(finding.snapshotId);
    expect(adapter.snapshot().findings.find(item => item.id === finding.id)?.status).toBe("REOPENED");
  });

  it("requires a confirmed external posting snapshot and leaves internal journals untouched", async () => {
    const adapter = new InMemoryDemoAdapter();
    const { snapshotId } = await buildControlledSnapshot(adapter, "ODOO");
    const initial = adapter.snapshot();
    const finding = initial.findings.find(item => item.ruleId === "BNK-001")!;
    expect(initial.controlRuns[0].results.find(item => item.ruleId === "ACC-006")?.status).toBe("INSUFFICIENT_DATA");
    await expect(adapter.proposeFindingCorrection(finding.id)).rejects.toThrow(/ERP/);
    await expect(adapter.revalidateFinding(finding.id)).rejects.toThrow(/ERP/);
    const update = await adapter.loadSyntheticErpCorrection(finding.id);
    expect(await adapter.loadSyntheticErpCorrection(finding.id)).toBe(update);
    await expect(adapter.revalidateFinding(finding.id)).rejects.toThrow(/ERP/);
    await adapter.applyImportMappings(update, suggestedAccountMappings("org-nile"));
    await adapter.validateImportBatch(update);
    const newSnapshotId = await adapter.confirmImportBatch(update);
    await adapter.revalidateFinding(finding.id);
    const checked = adapter.snapshot();
    expect(checked.journals).toEqual(initial.journals);
    expect(checked.financialSnapshots.find(item => item.id === snapshotId)).toEqual(initial.financialSnapshots[0]);
    expect(checked.controlRuns[0].snapshotId).toBe(newSnapshotId);
    expect(checked.controlRuns[0].results.find(item => item.ruleId === "BNK-001")?.status).toBe("PASSED");
    expect(checked.findings.find(item => item.id === finding.id)).toMatchObject({ status: "RESOLVED", revalidationRunId: checked.controlRuns[0].id });
    await adapter.runControlSnapshot(snapshotId);
    expect(adapter.snapshot().findings.find(item => item.id === finding.id)?.status).toBe("RESOLVED");
  });

  it("does not resolve when the required rule is disabled", async () => {
    const adapter = new InMemoryDemoAdapter();
    await buildControlledSnapshot(adapter, "ODOO");
    const finding = adapter.snapshot().findings.find(item => item.ruleId === "BNK-001")!;
    const batchId = await adapter.loadSyntheticErpCorrection(finding.id);
    await adapter.applyImportMappings(batchId, suggestedAccountMappings("org-nile"));
    await adapter.validateImportBatch(batchId);
    await adapter.confirmImportBatch(batchId);
    const disabledState = structuredClone(adapter.snapshot());
    disabledState.controlRules.find(item => item.id === "BNK-001")!.enabled = false;
    const disabled = new InMemoryDemoAdapter(disabledState);
    await disabled.revalidateFinding(finding.id);
    expect(disabled.snapshot().findings.find(item => item.id === finding.id)).toMatchObject({ status: "REOPENED", revalidationResult: "DISABLED" });
  });

  it("isolates batches, snapshots and findings between companies", async () => {
    const adapter = new InMemoryDemoAdapter();
    const { snapshotId } = await buildControlledSnapshot(adapter);
    await adapter.switchOrganization("org-delta");
    await expect(adapter.runControlSnapshot(snapshotId)).rejects.toThrow(/لا تخص الشركة/);
    expect(adapter.snapshot().findings.filter(item => item.organizationId === "org-delta")).toHaveLength(0);
  });
});
