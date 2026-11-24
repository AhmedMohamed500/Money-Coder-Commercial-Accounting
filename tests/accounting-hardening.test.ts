import { describe, expect, it } from "vitest";
import { buildDemoReport } from "@/application/demo/reporting";
import { InMemoryDemoAdapter } from "@/data/adapters/demo/in-memory-demo-adapter";

const validLines = [
  { id: "h1", accountId: "org-nile-1110", description: "اختبار", debitMinor: 10_000, creditMinor: 0 },
  { id: "h2", accountId: "org-nile-4110", description: "اختبار", debitMinor: 0, creditMinor: 10_000 },
];

describe("hardened accounting workflow", () => {
  it("enforces draft, submission, independent approval and posting", async () => {
    const adapter = new InMemoryDemoAdapter();
    await adapter.switchRole("COMPANY_ACCOUNTANT");
    const id = await adapter.createJournalDraft({ date: "2026-11-20", memo: "مسار صريح", reference: "WF-001", lines: validLines });
    expect(adapter.snapshot().journals.find(item => item.id === id)?.status).toBe("DRAFT");
    await adapter.submitJournal(id);
    await expect(adapter.approveJournal(id)).rejects.toThrow(/الصلاحية|فصل المهام/);
    await adapter.switchRole("FINANCE_MANAGER");
    await adapter.approveJournal(id);
    await adapter.switchRole("COMPANY_ACCOUNTANT");
    await adapter.postJournal(id);
    expect(adapter.snapshot().journals.find(item => item.id === id)?.status).toBe("POSTED");
  });

  it("rejects inactive and summary accounts and blocks posting into a closed period", async () => {
    const adapter = new InMemoryDemoAdapter();
    await adapter.switchRole("COMPANY_ACCOUNTANT");
    await expect(adapter.createJournalDraft({ date: "2026-11-20", memo: "تجميعي", reference: "WF-SUM", lines: [{ ...validLines[0], accountId: "org-nile-1100" }, validLines[1]] })).rejects.toThrow(/تجميعي/);
    await expect(adapter.createJournalDraft({ date: "2026-11-20", memo: "متوقف", reference: "WF-INACTIVE", lines: [{ ...validLines[0], accountId: "org-nile-6190" }, validLines[1]] })).rejects.toThrow(/غير نشط/);
    const id = await adapter.createJournalDraft({ date: "2026-03-20", memo: "فترة مقفلة", reference: "WF-CLOSED", lines: validLines });
    await expect(adapter.submitJournal(id)).rejects.toThrow(/مقفلة/);
  });

  it("reversal preserves immutable history and neutralizes the posted effect", async () => {
    const adapter = new InMemoryDemoAdapter();
    const before = buildDemoReport(adapter.snapshot(), "org-nile").revenueMinor;
    await adapter.switchRole("COMPANY_ACCOUNTANT");
    const id = await adapter.createJournalDraft({ date: "2026-11-20", memo: "قيد للعكس", reference: "WF-REV", lines: validLines });
    await adapter.submitJournal(id);
    await adapter.switchRole("FINANCE_MANAGER");
    await adapter.approveJournal(id);
    await adapter.switchRole("SENIOR_ACCOUNTANT");
    await adapter.postJournal(id);
    expect(buildDemoReport(adapter.snapshot(), "org-nile").revenueMinor).toBe(before + 10_000);
    const reversalId = await adapter.reverseJournal(id, "عكس تجريبي معتمد");
    expect(adapter.snapshot().journals.find(item => item.id === id)).toMatchObject({ status: "REVERSED", reversedById: reversalId });
    expect(adapter.snapshot().journals.find(item => item.id === reversalId)).toMatchObject({ source: "REVERSAL", reversalOfId: id, status: "POSTED" });
    expect(buildDemoReport(adapter.snapshot(), "org-nile").revenueMinor).toBe(before);
  });
});
