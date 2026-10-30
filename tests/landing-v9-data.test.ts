import { describe, expect, it } from "vitest";
import { baselineScenario, horizonClosing, horizonCredits, horizonDebits, horizonOpening, horizonTransactions, projectedCash, runningBalance, trailSamples } from "../src/components/landing/v9/demo-data";
import { factoryExample, factoryGrossProfit, factoryOperatingProfit, factoryProductionCost } from "../src/components/landing/accounting-demo-data";

describe("V9 synthetic financial demonstrations", () => {
  it("reconciles all 15 Horizon transactions to the stated closing balance", () => {
    expect(horizonTransactions).toHaveLength(15);
    expect(horizonOpening).toBe(42_500);
    expect(horizonCredits).toBe(56_700);
    expect(horizonDebits).toBe(33_010);
    expect(horizonClosing).toBe(66_190);
    expect(runningBalance(14)).toBe(horizonClosing);
  });

  it("keeps each proposed journal balanced and treats the first receipt as a receivable collection", () => {
    expect(trailSamples[0].debitAccount).toBe("البنك");
    expect(trailSamples[0].creditAccount).toBe("العملاء");
    for (const sample of trailSamples) {
      const transaction = horizonTransactions[sample.transactionIndex];
      expect(sample.amount).toBe(transaction.credit || transaction.debit);
      expect(sample.amount).toBeGreaterThan(0);
    }
  });

  it("calculates the what-if scenario without counting delayed collections twice", () => {
    expect(projectedCash(baselineScenario)).toBe(60_000);
    expect(projectedCash({ ...baselineScenario, delayedCollections: 10_000 })).toBe(50_000);
    expect(projectedCash({ ...baselineScenario, payments: 90_000 })).toBe(-10_000);
    expect(projectedCash({ ...baselineScenario, collections: 5_000, delayedCollections: 20_000 })).toBe(30_000);
  });

  it("separates production cost from an assumed all-sold cost of goods sold", () => {
    expect(factoryProductionCost).toBe(factoryExample.materials + factoryExample.labor + factoryExample.overhead);
    expect(factoryProductionCost).toBe(220_000);
    expect(factoryGrossProfit).toBe(80_000);
    expect(factoryOperatingProfit).toBe(50_000);
  });
});
