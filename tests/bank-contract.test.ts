import { afterEach, describe, expect, it } from "vitest";
import { bankAutomationAvailability, signBankCallback, verifyBankCallback } from "@/integrations/n8n/client";
import { horizonFixture } from "@/lib/accounting/bank-fixture";
import { validateBankResult } from "@/lib/accounting/bank-contract";

const jobId = "11111111-1111-4111-8111-111111111111";
const oldMode = process.env.AUTOMATION_MODE;
const oldSecret = process.env.AUTOMATION_CALLBACK_SECRET;
afterEach(() => { if (oldMode === undefined) delete process.env.AUTOMATION_MODE; else process.env.AUTOMATION_MODE = oldMode; if (oldSecret === undefined) delete process.env.AUTOMATION_CALLBACK_SECRET; else process.env.AUTOMATION_CALLBACK_SECRET = oldSecret; });

describe("bank contract and fail-closed automation", () => {
  it("keeps the live adapter disabled without security prerequisites", () => {
    delete process.env.AUTOMATION_MODE;
    expect(bankAutomationAvailability().available).toBe(false);
    process.env.AUTOMATION_MODE = "REMOTE";
    expect(bankAutomationAvailability().available).toBe(false);
  });
  it("validates the deterministic 15-transaction synthetic sample in minor units", () => {
    const result = validateBankResult(horizonFixture(jobId));
    expect(result.rows).toHaveLength(15);
    expect(result.mathStatus).toBe("MATCHED");
    expect(result.closingBalance).toBe("66190.00");
    const mismatch = horizonFixture(jobId);
    mismatch.transactions[4].runningBalance = "1";
    expect(validateBankResult(mismatch).mathStatus).toBe("MISMATCHED");
    const falseTotal = horizonFixture(jobId);
    falseTotal.totalCredits = "56700.01";
    expect(validateBankResult(falseTotal).mathStatus).toBe("MISMATCHED");
  });
  it("rejects malformed claims and excessive precision", () => {
    expect(() => validateBankResult({ ...horizonFixture(jobId), reviewStatus: "approved" })).toThrow();
    const invalid = horizonFixture(jobId);
    invalid.transactions[0].credit = "0.001";
    expect(() => validateBankResult(invalid)).toThrow();
    expect(() => validateBankResult({ ...horizonFixture(jobId), transactionCount: 16 })).toThrow();
  });
  it("authenticates callback bytes and rejects stale or altered signatures", () => {
    process.env.AUTOMATION_MODE = "MOCK";
    process.env.AUTOMATION_CALLBACK_SECRET = "test-bank-callback-secret-at-least-32-characters";
    const body = JSON.stringify(horizonFixture(jobId)); const timestamp = String(Date.now()); const nonce = "synthetic-nonce-123456789";
    const signature = signBankCallback(body, timestamp, nonce, process.env.AUTOMATION_CALLBACK_SECRET);
    expect(verifyBankCallback(body, timestamp, nonce, signature)).toBeTruthy();
    expect(verifyBankCallback(body + " ", timestamp, nonce, signature)).toBeNull();
    expect(verifyBankCallback(body, String(Date.now() - 600_000), nonce, signature)).toBeNull();
  });
});
