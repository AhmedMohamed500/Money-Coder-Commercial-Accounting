import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const openapi = readFileSync(path.join(root, "contracts", "openapi.yaml"), "utf8");
const contracts = readFileSync(path.join(root, "src", "contracts", "v1.ts"), "utf8");

describe("backend handoff contract consistency", () => {
  it.each([
    "/organizations:",
    "/reviews/{reviewId}:",
    "/reviews/{reviewId}/transitions:",
    "/organizations/{organizationId}/journal-entries:",
    "/journal-entries/{journalId}/{action}:",
    "/organizations/{organizationId}/financial-reports/{reportType}:",
    "/bank-statement-imports/{importId}/rows:",
    "/bank-statement-imports/{importId}/rows/{rowId}/mapping:",
  ])("documents adapter endpoint %s", endpoint => {
    expect(openapi).toContain(endpoint);
  });

  it.each(["OrganizationV1", "DocumentV1", "ReviewCaseV1", "JournalEntryV1", "FinancialReportV1", "BankStatementRowV1"])("exports TypeScript DTO %s", dto => {
    expect(contracts).toContain(`interface ${dto}`);
  });

  it("keeps money as decimal strings and mutation controls explicit", () => {
    expect(openapi).toContain("Decimal: { type: string");
    expect(openapi).toContain("Idempotency-Key");
    expect(openapi).toContain("If-Match");
    expect(contracts).toContain("export type DecimalMoney = string");
    expect(contracts).toContain("expectedRevision");
  });
});
