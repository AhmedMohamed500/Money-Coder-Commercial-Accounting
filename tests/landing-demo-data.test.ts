import { describe, expect, it } from "vitest";
import { closingBankBalance, customerCollectionEntry, demoTransactions, factoryExample, factoryGrossProfit, factoryOperatingProfit, factoryProductionCost, financialPosition, incomeStatement, openingBankBalance, totalCredits, totalDebits, trialBalance, trialCreditTotal, trialDebitTotal } from "../src/components/landing/accounting-demo-data";

describe("illustrative landing financial scenario", () => {
  it("reconciles every bank movement with its running balance", () => {
    let balance = openingBankBalance;
    for (const transaction of demoTransactions) {
      balance += transaction.credit - transaction.debit;
      expect(transaction.balance).toBe(balance);
    }
    expect(totalCredits).toBe(16_000);
    expect(totalDebits).toBe(4_000);
    expect(closingBankBalance).toBe(32_000);
  });

  it("treats customer debt collection as bank debit and receivables credit", () => {
    expect(demoTransactions[0].credit).toBe(customerCollectionEntry.bankDebit);
    expect(customerCollectionEntry.bankDebit).toBe(customerCollectionEntry.receivablesCredit);
    expect(customerCollectionEntry.bankDebit).toBe(10_000);
  });

  it("keeps the illustrative trial balance and statements consistent", () => {
    expect(trialDebitTotal).toBe(66_000);
    expect(trialCreditTotal).toBe(66_000);
    expect(trialBalance.find(account => account.code === "1010")?.debit).toBe(closingBankBalance);
    expect(incomeStatement.profit).toBe(2_000);
    expect(financialPosition).toEqual({ assets: 62_000, liabilities: 10_000, equity: 52_000 });
    expect(financialPosition.assets).toBe(financialPosition.liabilities + financialPosition.equity);
  });

  it("separates manufacturing cost from period expenses", () => {
    expect(factoryProductionCost).toBe(220_000);
    expect(factoryGrossProfit).toBe(factoryExample.sales - factoryProductionCost);
    expect(factoryGrossProfit).toBe(80_000);
    expect(factoryOperatingProfit).toBe(factoryGrossProfit - factoryExample.administration - factoryExample.selling);
    expect(factoryOperatingProfit).toBe(50_000);
  });
});
