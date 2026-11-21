import { describe, expect, it } from "vitest";
import { buildAccountBalances, buildDemoReport } from "@/application/demo/reporting";
import { InMemoryDemoAdapter } from "@/data/adapters/demo/in-memory-demo-adapter";
import { isBalanced, type JournalLine } from "@/domain/demo/types";

describe("demo accounting accuracy", () => {
  it("classifies the chart of accounts consistently", () => {
    const accounts = new InMemoryDemoAdapter().snapshot().accounts.filter(item => item.organizationId === "org-nile");
    expect(Object.fromEntries(accounts.map(item => [item.code, item.type]))).toEqual({
      "1110": "ASSET", "1120": "ASSET", "1210": "ASSET", "2110": "LIABILITY",
      "3110": "EQUITY", "4110": "REVENUE", "5110": "EXPENSE", "6110": "EXPENSE",
    });
  });

  it("accepts balanced lines and rejects an unbalanced journal", async () => {
    const adapter = new InMemoryDemoAdapter();
    const bank = "org-nile-1110";
    const revenue = "org-nile-4110";
    const balanced: JournalLine[] = [
      { id: "b1", accountId: bank, description: "", debitMinor: 12_345, creditMinor: 0 },
      { id: "b2", accountId: revenue, description: "", debitMinor: 0, creditMinor: 12_345 },
    ];
    expect(isBalanced(balanced)).toBe(true);
    await expect(adapter.createAndPostJournal({ date: "2026-11-20", memo: "اختبار", reference: "ACC-UNBAL", lines: [{ ...balanced[0] }, { ...balanced[1], creditMinor: 12_344 }] })).rejects.toThrow(/غير متوازن/);
  });

  it("produces exact ledger balances, trial balance, income statement and position equation", () => {
    const state = new InMemoryDemoAdapter().snapshot();
    const balances = buildAccountBalances(state, "org-nile");
    const report = buildDemoReport(state, "org-nile");
    const byCode = Object.fromEntries(balances.map(item => [item.account.code, item.balanceMinor]));
    expect(byCode["1110"]).toBe(31_000_000);
    expect(byCode["1120"]).toBe(12_000_000);
    expect(byCode["1210"]).toBe(3_000_000);
    expect(byCode["2110"]).toBe(9_000_000);
    expect(report.revenueMinor).toBe(12_000_000);
    expect(report.expenseMinor).toBe(9_000_000);
    expect(report.profitMinor).toBe(3_000_000);
    expect(report.assetsMinor).toBe(46_000_000);
    expect(report.liabilitiesMinor + report.equityMinor).toBe(report.assetsMinor);
    const trial = report.trialBalance.reduce((total, row) => ({ debit: total.debit + row.debitMinor, credit: total.credit + row.creditMinor }), { debit: 0, credit: 0 });
    expect(trial.debit).toBe(trial.credit);
  });

  it("keeps currencies and companies separated", async () => {
    const adapter = new InMemoryDemoAdapter();
    const nileBefore = buildDemoReport(adapter.snapshot(), "org-nile");
    await adapter.switchOrganization("org-horizon");
    await adapter.createAndPostJournal({ date: "2026-11-20", memo: "USD demo", reference: "USD-ONLY", lines: [
      { id: "u1", accountId: "org-horizon-1110", description: "", debitMinor: 50_000, creditMinor: 0 },
      { id: "u2", accountId: "org-horizon-4110", description: "", debitMinor: 0, creditMinor: 50_000 },
    ] });
    expect(adapter.snapshot().organizations.find(item => item.id === "org-horizon")?.currency).toBe("USD");
    expect(adapter.snapshot().organizations.find(item => item.id === "org-nile")?.currency).toBe("EGP");
    expect(buildDemoReport(adapter.snapshot(), "org-nile")).toEqual(nileBefore);
    expect(buildDemoReport(adapter.snapshot(), "org-horizon").revenueMinor).toBe(12_050_000);
    await expect(adapter.createAndPostJournal({ date: "2026-11-20", memo: "cross tenant", reference: "CROSS-ORG", lines: [
      { id: "c1", accountId: "org-nile-1110", description: "", debitMinor: 1_000, creditMinor: 0 },
      { id: "c2", accountId: "org-nile-4110", description: "", debitMinor: 0, creditMinor: 1_000 },
    ] })).rejects.toThrow(/لا يخص الشركة الحالية/);
  });

  it("prevents duplicate manual references and repeated bank posting", async () => {
    const adapter = new InMemoryDemoAdapter();
    const input = { date: "2026-11-20", memo: "duplicate guard", reference: "UNIQUE-REF", lines: [
      { id: "d1", accountId: "org-nile-1110", description: "", debitMinor: 1_000, creditMinor: 0 },
      { id: "d2", accountId: "org-nile-4110", description: "", debitMinor: 0, creditMinor: 1_000 },
    ] };
    await adapter.createAndPostJournal(input);
    await expect(adapter.createAndPostJournal(input)).rejects.toThrow(/مستخدم بالفعل/);
    await adapter.createBankSuggestion("bank-row-1", "org-nile-4110");
    const draftId = await adapter.createBankDraft("bank-row-1");
    expect(await adapter.createBankDraft("bank-row-1")).toBe(draftId);
    await adapter.postDraftJournal(draftId);
    await expect(adapter.postDraftJournal(draftId)).rejects.toThrow(/تم ترحيل/);
    expect(adapter.snapshot().journals.filter(item => item.id === draftId && item.status === "POSTED")).toHaveLength(1);
    await expect(adapter.createBankSuggestion("bank-row-2", "org-nile-1110")).rejects.toThrow(/الطرف المقابل/);
  });

  it("restores the deterministic baseline on reset", async () => {
    const adapter = new InMemoryDemoAdapter();
    const baseline = structuredClone(adapter.snapshot());
    await adapter.simulateUpload({ title: "عينة reset", category: "OTHER" });
    await adapter.switchOrganization("org-delta");
    await adapter.reset();
    expect(adapter.snapshot()).toEqual(baseline);
  });
});
