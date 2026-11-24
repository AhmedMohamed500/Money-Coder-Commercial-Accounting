import type { Account, DemoReport, DemoState, OrganizationId, TrialBalanceRow } from "@/domain/demo/types";
import { isLedgerEntry, naturalSignedBalance } from "@/application/accounting/rules";

export interface AccountBalance {
  account: Account;
  debitTurnoverMinor: number;
  creditTurnoverMinor: number;
  rawBalanceMinor: number;
  balanceMinor: number;
}

export function buildAccountBalances(state: DemoState, organizationId: OrganizationId, range?: { from?: string; to?: string }): AccountBalance[] {
  const accounts = state.accounts.filter(account => account.organizationId === organizationId);
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const entry of state.journals.filter(item => item.organizationId === organizationId && isLedgerEntry(item) && (!range?.from || item.date >= range.from) && (!range?.to || item.date <= range.to))) {
    for (const line of entry.lines) {
      const current = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit += line.debitMinor;
      current.credit += line.creditMinor;
      totals.set(line.accountId, current);
    }
  }
  return accounts.map(account => {
    const total = totals.get(account.id) ?? { debit: 0, credit: 0 };
    const rawBalanceMinor = total.debit - total.credit;
    return { account, debitTurnoverMinor: total.debit, creditTurnoverMinor: total.credit, rawBalanceMinor, balanceMinor: naturalSignedBalance(account, total.debit, total.credit) };
  });
}

export function buildDemoReport(state: DemoState, organizationId: OrganizationId, range?: { from?: string; to?: string }): DemoReport {
  const accounts = state.accounts.filter(account => account.organizationId === organizationId);
  const balances = buildAccountBalances(state, organizationId, range);

  const trialBalance: TrialBalanceRow[] = accounts.map(account => {
    const balance = balances.find(item => item.account.id === account.id)!;
    return { account, debitMinor: Math.max(balance.rawBalanceMinor, 0), creditMinor: Math.max(-balance.rawBalanceMinor, 0) };
  }).filter(row => row.debitMinor || row.creditMinor);

  const balanceFor = (account: Account) => (balances.find(item => item.account.id === account.id)?.balanceMinor ?? 0) * account.statementSign;
  const sumType = (type: Account["type"]) => accounts.filter(account => account.type === type && account.postingAllowed).reduce((sum, account) => sum + balanceFor(account), 0);
  const revenueMinor = sumType("REVENUE");
  const expenseMinor = sumType("EXPENSE");
  const profitMinor = revenueMinor - expenseMinor;
  const positionBalances = range?.from ? buildAccountBalances(state, organizationId, { to: range.to }) : balances;
  const positionTotal = (type: Account["type"]) => positionBalances
    .filter(({ account }) => account.type === type && account.postingAllowed)
    .reduce((sum, { account, balanceMinor }) => sum + balanceMinor * account.statementSign, 0);
  const assetsMinor = positionTotal("ASSET");
  const liabilitiesMinor = positionTotal("LIABILITY");
  const cumulativeProfit = range?.from ? positionTotal("REVENUE") - positionTotal("EXPENSE") : profitMinor;
  const equityMinor = positionTotal("EQUITY") + cumulativeProfit;
  return { revenueMinor, expenseMinor, profitMinor, assetsMinor, liabilitiesMinor, equityMinor, trialBalance };
}

export interface PeriodTrialBalanceRow {
  account: Account;
  openingDebitMinor: number;
  openingCreditMinor: number;
  movementDebitMinor: number;
  movementCreditMinor: number;
  closingDebitMinor: number;
  closingCreditMinor: number;
}

export function buildPeriodTrialBalance(state: DemoState, organizationId: OrganizationId, from: string, to: string): PeriodTrialBalanceRow[] {
  const opening = buildAccountBalances(state, organizationId, { to: previousDate(from) });
  const movement = buildAccountBalances(state, organizationId, { from, to });
  return state.accounts.filter(account => account.organizationId === organizationId && account.postingAllowed).map(account => {
    const openingRow = opening.find(item => item.account.id === account.id);
    const movementRow = movement.find(item => item.account.id === account.id);
    const openingRaw = openingRow?.rawBalanceMinor ?? 0;
    const movementDebitMinor = movementRow?.debitTurnoverMinor ?? 0;
    const movementCreditMinor = movementRow?.creditTurnoverMinor ?? 0;
    const closingRaw = openingRaw + movementDebitMinor - movementCreditMinor;
    return {
      account,
      openingDebitMinor: Math.max(openingRaw, 0),
      openingCreditMinor: Math.max(-openingRaw, 0),
      movementDebitMinor,
      movementCreditMinor,
      closingDebitMinor: Math.max(closingRaw, 0),
      closingCreditMinor: Math.max(-closingRaw, 0),
    };
  }).filter(row => row.openingDebitMinor || row.openingCreditMinor || row.movementDebitMinor || row.movementCreditMinor);
}

function previousDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}
