import { describe, expect, it } from "vitest";
import { isAllowedScanTransition, isScanApproved, matchesCurrentScanResult, type DocumentScanStatus, type ScanResultIdentity } from "@/lib/document-scan-policy";

const statuses: DocumentScanStatus[] = ["PENDING_SCAN", "SCANNING", "CLEAN", "REJECTED", "SCAN_FAILED"];
const allowed = new Set([
  "PENDING_SCAN:SCANNING",
  "SCANNING:CLEAN",
  "SCANNING:REJECTED",
  "SCANNING:SCAN_FAILED",
  "SCAN_FAILED:PENDING_SCAN",
  "CLEAN:PENDING_SCAN",
  "REJECTED:PENDING_SCAN",
]);

describe("document scan domain policy", () => {
  it("allows only the declared transitions", () => {
    for (const from of statuses) for (const to of statuses) {
      expect(isAllowedScanTransition(from, to), `${from} -> ${to}`).toBe(allowed.has(`${from}:${to}`));
    }
    for (const to of statuses) expect(isAllowedScanTransition(null, to)).toBe(false);
  });

  it("treats only CLEAN as approved", () => {
    for (const status of [null, ...statuses]) expect(isScanApproved(status)).toBe(status === "CLEAN");
  });

  it("requires a current lease, revision, object, checksum, and live file", () => {
    const now = new Date("2026-10-28T12:00:00.000Z");
    const hash = "a".repeat(64);
    const current: ScanResultIdentity = { status: "SCANNING", revision: 2, leaseToken: "lease-2", leaseExpiresAt: new Date(now.getTime() + 1_000), storageKey: "organizations/file", expectedSha256: hash, deletedAt: null };
    const result = { revision: 2, leaseToken: "lease-2", storageKey: "organizations/file", expectedSha256: hash, resultSha256: hash };
    expect(matchesCurrentScanResult(current, result, now)).toBe(true);
    expect(matchesCurrentScanResult({ ...current, status: "SCAN_FAILED" }, result, now)).toBe(false);
    expect(matchesCurrentScanResult({ ...current, deletedAt: now }, result, now)).toBe(false);
    expect(matchesCurrentScanResult({ ...current, leaseExpiresAt: now }, result, now)).toBe(false);
    expect(matchesCurrentScanResult({ ...current, leaseToken: null }, result, now)).toBe(false);
    expect(matchesCurrentScanResult({ ...current, expectedSha256: "" }, result, now)).toBe(false);
    expect(matchesCurrentScanResult(current, { ...result, revision: 1 }, now)).toBe(false);
    expect(matchesCurrentScanResult(current, { ...result, leaseToken: "old-lease" }, now)).toBe(false);
    expect(matchesCurrentScanResult(current, { ...result, storageKey: "other" }, now)).toBe(false);
    expect(matchesCurrentScanResult(current, { ...result, expectedSha256: "" }, now)).toBe(false);
    expect(matchesCurrentScanResult(current, { ...result, resultSha256: "b".repeat(64) }, now)).toBe(false);
  });
});
