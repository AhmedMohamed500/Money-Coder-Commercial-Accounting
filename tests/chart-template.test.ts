import { describe, expect, it } from "vitest";
import { ACTIVITY_TEMPLATES, commercialChartTemplate, validateCommercialTemplate } from "@/lib/accounting/chart-template";

describe("Egyptian commercial account template", () => {
  it("is complete, independent, and has unique valid hierarchy", () => {
    const result = validateCommercialTemplate();
    expect(result.accountCount).toBeGreaterThan(180);
    expect(result.postingCount).toBeGreaterThan(130);
    expect(commercialChartTemplate.filter(account => !account.parentCode)).toHaveLength(8);
    expect(new Set(commercialChartTemplate.map(account => account.code)).size).toBe(result.accountCount);
    expect(ACTIVITY_TEMPLATES.COMMERCIAL.ready).toBe(true);
    expect(ACTIVITY_TEMPLATES.INDUSTRIAL.ready).toBe(false);
    expect(ACTIVITY_TEMPLATES.SERVICE.ready).toBe(false);
  });

  it("classifies contra accounts, VAT, inventory and finance income correctly", () => {
    const get = (code: string) => commercialChartTemplate.find(account => account.code === code);
    expect(get("112006")).toMatchObject({ accountClass: "ASSET", normalBalance: "CREDIT", isContra: true });
    expect(get("122001")).toMatchObject({ accountClass: "ASSET", normalBalance: "CREDIT", isContra: true });
    expect(get("420001")).toMatchObject({ accountClass: "REVENUE", reportGroup: "CONTRA_REVENUE", normalBalance: "DEBIT" });
    expect(get("116001")).toMatchObject({ accountClass: "ASSET", reportGroup: "CURRENT_ASSET" });
    expect(get("215001")).toMatchObject({ accountClass: "LIABILITY", reportGroup: "CURRENT_LIABILITY" });
    expect(get("810001")).toMatchObject({ accountClass: "REVENUE", reportGroup: "OTHER_INCOME" });
    expect(get("510001")).toMatchObject({ accountClass: "EXPENSE", reportGroup: "COST_OF_SALES" });
    expect(get("510001")?.inventoryMethod).toBe("PERPETUAL");
    expect(get("520001")?.inventoryMethod).toBe("PERIODIC");
    expect(commercialChartTemplate.some(account => "balance" in account)).toBe(false);
  });

  it("rejects missing parents and duplicate codes", () => {
    expect(() => validateCommercialTemplate([...commercialChartTemplate, commercialChartTemplate[0]])).toThrow("Duplicate");
    expect(() => validateCommercialTemplate([{ ...commercialChartTemplate[0], parentCode: "9999" }])).toThrow("Invalid parent");
  });
});
