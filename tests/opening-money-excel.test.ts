import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { currencyPrecision, openingTotals, parseMoney, validateSides } from "@/lib/accounting/opening-money";
import { openingTemplate, parseOpeningXlsx, inspectXlsx } from "@/lib/accounting/opening-excel";
import { reviewImportRows } from "@/lib/accounting/opening-service";
import { accountingSameOrigin } from "@/lib/accounting/same-origin";

describe("opening balances amounts and Excel", () => {
  it("uses exact decimal arithmetic and rejects invalid sides and precision", () => {
    expect(currencyPrecision("EGP")).toBe(2);
    expect(currencyPrecision("KWD")).toBe(3);
    expect(parseMoney("١٢٣.٤", 2).text).toBe("123.40");
    expect(openingTotals([{ debit: "0.10", credit: "0" }, { debit: "0.20", credit: "0" }, { debit: "0", credit: "0.30" }], 2)).toMatchObject({ balanced: true, difference: "0.00" });
    expect(() => validateSides("1", "1", 2)).toThrow();
    expect(() => parseMoney("-1", 2)).toThrow();
    expect(() => parseMoney("1.001", 2)).toThrow();
  });

  it("round trips the template without formulas or matching account names", async () => {
    const buffer = await openingTemplate([{ code: "111001", nameAr: "النقدية" }]);
    const parsed = await parseOpeningXlsx(buffer);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({ code: "111001", name: "النقدية", debit: "0", credit: "0" });
    expect(parsed.sha256).toHaveLength(64);
  });

  it("supports explicit column mapping and rejects formula cells", async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Sheet1");
    sheet.addRow(["Code", "Debit", "Credit"]);
    sheet.addRow(["111001", "25.5", "0"]);
    const buffer = Buffer.from(await book.xlsx.writeBuffer());
    const parsed = await parseOpeningXlsx(buffer, { code: 1, debit: 2, credit: 3 });
    expect(parsed.rows[0].debit).toBe("25.5");
    sheet.getCell("B2").value = { formula: "1+1", result: 2 };
    await expect(parseOpeningXlsx(Buffer.from(await book.xlsx.writeBuffer()), { code: 1, debit: 2, credit: 3 })).rejects.toThrow("الصيغ");
  });

  it("rejects oversized files, missing/duplicate codes and invalid amounts", () => {
    expect(() => inspectXlsx(Buffer.alloc(2_000_001))).toThrow();
    const account = { id: "a", code: "111001", isPostable: true, isActive: true, deletedAt: null, inventoryMethod: null };
    const row = { rowNumber: 2, code: "111001", name: "", debit: "10", credit: "0", explanation: "", sourceReference: "" };
    const result = reviewImportRows([row, { ...row, rowNumber: 3 }, { ...row, rowNumber: 4, code: "999999", debit: "bad" }], [account], 2, null);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["DUPLICATE_ACCOUNT", "UNKNOWN_ACCOUNT", "INVALID_AMOUNT"]));
  });

  it("accepts a browser Origin matching Host behind a local proxy and rejects foreign origins", () => {
    const headers = { host: "money.example.test", "x-forwarded-proto": "https", origin: "https://money.example.test" };
    expect(accountingSameOrigin(new Request("http://localhost:3000/api/test", { headers }))).toBe(true);
    expect(accountingSameOrigin(new Request("http://localhost:3000/api/test", { headers: { ...headers, origin: "https://evil.example.test" } }))).toBe(false);
  });
});
