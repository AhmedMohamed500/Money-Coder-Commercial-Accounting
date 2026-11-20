import { describe, expect, it, vi } from "vitest";
import { InMemoryDemoAdapter } from "@/data/adapters/demo/in-memory-demo-adapter";

describe("frontend-first demo adapter", () => {
  it("keeps company context isolated", () => {
    const adapter = new InMemoryDemoAdapter();
    const nileIds = adapter.snapshot().documents.filter(item => item.organizationId === "org-nile").map(item => item.id);
    adapter.switchOrganization("org-delta");
    const deltaIds = adapter.snapshot().documents.filter(item => item.organizationId === adapter.snapshot().currentOrganizationId).map(item => item.id);
    expect(deltaIds.length).toBeGreaterThan(0);
    expect(deltaIds.some(id => nileIds.includes(id))).toBe(false);
  });

  it("runs correction, resubmission and approval as one connected workflow", () => {
    const adapter = new InMemoryDemoAdapter();
    const review = adapter.snapshot().reviews.find(item => item.organizationId === "org-nile")!;
    const document = adapter.snapshot().documents.find(item => item.id === review.documentId)!;
    const originalVersion = document.versions.length;

    adapter.transitionReview(review.id, "CORRECTION_REQUESTED", "أكمل المستند التجريبي");
    expect(adapter.snapshot().reviews.find(item => item.id === review.id)?.status).toBe("CORRECTION_REQUESTED");
    adapter.transitionReview(review.id, "RESUBMITTED", "نسخة تجريبية مصححة");
    expect(adapter.snapshot().documents.find(item => item.id === document.id)?.versions).toHaveLength(originalVersion + 1);
    adapter.transitionReview(review.id, "APPROVED", "اعتماد تجريبي");
    expect(adapter.snapshot().documents.find(item => item.id === document.id)?.status).toBe("APPROVED");
  });

  it("rejects unbalanced journals and updates reports after a balanced posting", () => {
    const adapter = new InMemoryDemoAdapter();
    const state = adapter.snapshot();
    const bank = state.accounts.find(item => item.organizationId === "org-nile" && item.code === "1110")!;
    const revenue = state.accounts.find(item => item.organizationId === "org-nile" && item.code === "4110")!;
    const before = adapter.report().revenueMinor;
    const base = { date: "2026-11-20", memo: "قيد اختبار تجريبي", reference: "TEST-01" };

    expect(() => adapter.createAndPostJournal({ ...base, lines: [
      { id: "l1", accountId: bank.id, description: "", debitMinor: 100_000, creditMinor: 0 },
      { id: "l2", accountId: revenue.id, description: "", debitMinor: 0, creditMinor: 90_000 },
    ] })).toThrow(/غير متوازن/);

    adapter.createAndPostJournal({ ...base, lines: [
      { id: "l1", accountId: bank.id, description: "", debitMinor: 100_000, creditMinor: 0 },
      { id: "l2", accountId: revenue.id, description: "", debitMinor: 0, creditMinor: 100_000 },
    ] });
    expect(adapter.report().revenueMinor).toBe(before + 100_000);
    const totals = adapter.report().trialBalance.reduce((sum, row) => ({ debit: sum.debit + row.debitMinor, credit: sum.credit + row.creditMinor }), { debit: 0, credit: 0 });
    expect(totals.debit).toBe(totals.credit);
  });

  it("uses no network services and reset restores the deterministic baseline", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const adapter = new InMemoryDemoAdapter();
    const baseline = adapter.snapshot().documents.length;
    adapter.simulateUpload({ title: "عينة جديدة", category: "OTHER" });
    expect(adapter.snapshot().documents).toHaveLength(baseline + 1);
    adapter.reset();
    expect(adapter.snapshot().documents).toHaveLength(baseline);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
