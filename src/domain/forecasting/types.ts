export interface ForecastScenario {
  id: string;
  organizationId: string;
  name: string;
  kind: "BEST" | "BASE" | "WORST" | "CUSTOM";
  expectedSalesMinor: number;
  costOfSalesPercent: number;
  operatingExpensesMinor: number;
  collectionDays: number;
  supplierPaymentDays: number;
  futureCapitalExpenditureMinor: number;
  updatedAt: string;
}

export interface ForecastResult {
  revenueMinor: number;
  costOfSalesMinor: number;
  grossProfitMinor: number;
  operatingProfitMinor: number;
  projectedCashImpactMinor: number;
}

