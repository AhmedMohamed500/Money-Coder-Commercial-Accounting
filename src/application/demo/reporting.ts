import type { Account, DemoReport, DemoState, OrganizationId, TrialBalanceRow } from "@/domain/demo/types";

export function buildDemoReport(state: DemoState, organizationId: OrganizationId): DemoReport {
  const accounts = state.accounts.filter(account => account.organizationId === organizationId);
  const posted = state.journals.filter(entry => entry.organizationId === organizationId && entry.status === "POSTED");
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const entry of posted) {
    for (const line of entry.lines) {
      const current = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit += line.debitMinor;
      current.credit += line.creditMinor;
      totals.set(line.accountId, current);
    }
  }

  const trialBalance: TrialBalanceRow[] = accounts.map(account => {
    const total = totals.get(account.id) ?? { debit: 0, credit: 0 };
    const naturalDebit = account.type === "ASSET" || account.type === "EXPENSE";
    const net = naturalDebit ? total.debit - total.credit : total.credit - total.debit;
    return { account, debitMinor: naturalDebit ? Math.max(net, 0) : Math.max(-net, 0), creditMinor: naturalDebit ? Math.max(-net, 0) : Math.max(net, 0) };
  }).filter(row => row.debitMinor || row.creditMinor);

  const balanceFor = (account: Account) => {
    const total = totals.get(account.id) ?? { debit: 0, credit: 0 };
    return account.type === "ASSET" || account.type === "EXPENSE" ? total.debit - total.credit : total.credit - total.debit;
  };
  const sumType = (type: Account["type"]) => accounts.filter(account => account.type === type).reduce((sum, account) => sum + balanceFor(account), 0);
  const revenueMinor = sumType("REVENUE");
  const expenseMinor = sumType("EXPENSE");
  const profitMinor = revenueMinor - expenseMinor;
  const assetsMinor = sumType("ASSET");
  const liabilitiesMinor = sumType("LIABILITY");
  const equityMinor = sumType("EQUITY") + profitMinor;
  return { revenueMinor, expenseMinor, profitMinor, assetsMinor, liabilitiesMinor, equityMinor, trialBalance };
}
