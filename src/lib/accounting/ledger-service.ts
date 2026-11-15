import { db } from "@/lib/db";
import { formatMinor, parseMoney } from "./opening-money";
import { JournalError } from "./journal-service";

function parseDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new JournalError(`${label} غير صالح.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new JournalError(`${label} غير صالح.`);
  return date;
}

function side(netDebit: bigint, precision: number) {
  return netDebit >= BigInt(0)
    ? { debit: formatMinor(netDebit, precision), credit: formatMinor(BigInt(0), precision), side: "DEBIT" as const }
    : { debit: formatMinor(BigInt(0), precision), credit: formatMinor(-netDebit, precision), side: "CREDIT" as const };
}

export async function generalLedger(organizationId: string, input: { accountId: string; fiscalYearId: string; from: string; to: string }) {
  const from = parseDate(input.from, "تاريخ البداية"); const to = parseDate(input.to, "تاريخ النهاية");
  if (to < from) throw new JournalError("تاريخ النهاية يجب أن يكون بعد البداية.");
  const [account, fiscalYear, settings] = await Promise.all([
    db.chartAccount.findFirst({ where: { id: input.accountId, organizationId, deletedAt: null }, select: { id: true, code: true, nameAr: true, nameEn: true, normalBalance: true, accountClass: true, isPostable: true } }),
    db.companyFiscalYear.findFirst({ where: { id: input.fiscalYearId, organizationId }, select: { id: true, name: true, startsAt: true, endsAt: true } }),
    db.companyAccountingSettings.findUnique({ where: { organizationId }, select: { baseCurrency: true } }),
  ]);
  if (!account) throw new JournalError("الحساب غير موجود.", 404);
  if (!fiscalYear) throw new JournalError("السنة المالية غير موجودة.", 404);
  if (from < fiscalYear.startsAt || to > fiscalYear.endsAt) throw new JournalError("نطاق التقرير خارج السنة المالية.", 409);
  const currency = settings?.baseCurrency ?? "EGP";
  const precision = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const lines = await db.journalLine.findMany({
    where: { organizationId, accountId: account.id, entry: { fiscalYearId: fiscalYear.id, postedAt: { not: null }, status: { in: ["POSTED", "REVERSED"] }, postingDate: { lte: to } } },
    orderBy: [{ entry: { postingDate: "asc" } }, { entry: { entryNumber: "asc" } }, { lineNumber: "asc" }],
    include: { entry: { select: { id: true, entryNumber: true, reference: true, description: true, transactionDate: true, postingDate: true, entryType: true, sourceType: true, sourceReference: true, status: true } }, _count: { select: { evidenceLinks: true } } },
  });
  let openingNet = BigInt(0);
  for (const line of lines.filter(line => line.entry.postingDate < from)) openingNet += parseMoney(line.debit.toString(), precision).minor - parseMoney(line.credit.toString(), precision).minor;
  let running = openingNet; let periodDebit = BigInt(0); let periodCredit = BigInt(0);
  const movements = lines.filter(line => line.entry.postingDate >= from).map(line => {
    const debit = parseMoney(line.debit.toString(), precision).minor; const credit = parseMoney(line.credit.toString(), precision).minor;
    periodDebit += debit; periodCredit += credit; running += debit - credit;
    return { id: line.id, entryId: line.entry.id, entryNumber: line.entry.entryNumber, journalReference: line.entry.reference, postingDate: line.entry.postingDate, transactionDate: line.entry.transactionDate, description: line.description ?? line.entry.description, debit: formatMinor(debit, precision), credit: formatMinor(credit, precision), running: formatMinor(running < BigInt(0) ? -running : running, precision), runningSide: running >= BigInt(0) ? "DEBIT" as const : "CREDIT" as const, sourceReference: line.sourceReference ?? line.entry.sourceReference, sourceType: line.entry.sourceType, entryType: line.entry.entryType, evidenceCount: line._count.evidenceLinks };
  });
  return { account, fiscalYear, currency, precision, from, to, opening: side(openingNet, precision), totals: { debit: formatMinor(periodDebit, precision), credit: formatMinor(periodCredit, precision) }, closing: side(running, precision), movements };
}

export async function trialBalance(organizationId: string, input: { fiscalYearId: string; from: string; to: string; view?: "DETAILED" | "SUMMARY" }) {
  const from = parseDate(input.from, "تاريخ البداية"); const to = parseDate(input.to, "تاريخ النهاية");
  if (to < from) throw new JournalError("تاريخ النهاية يجب أن يكون بعد البداية.");
  const [fiscalYear, settings, accounts] = await Promise.all([
    db.companyFiscalYear.findFirst({ where: { id: input.fiscalYearId, organizationId }, select: { id: true, name: true, startsAt: true, endsAt: true } }),
    db.companyAccountingSettings.findUnique({ where: { organizationId }, select: { baseCurrency: true } }),
    db.chartAccount.findMany({ where: { organizationId, deletedAt: null, isPostable: true }, orderBy: { code: "asc" }, select: { id: true, code: true, nameAr: true, accountClass: true, normalBalance: true } }),
  ]);
  if (!fiscalYear) throw new JournalError("السنة المالية غير موجودة.", 404);
  if (from < fiscalYear.startsAt || to > fiscalYear.endsAt) throw new JournalError("نطاق التقرير خارج السنة المالية.", 409);
  const currency = settings?.baseCurrency ?? "EGP";
  const precision = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const lines = await db.journalLine.findMany({ where: { organizationId, entry: { fiscalYearId: fiscalYear.id, postedAt: { not: null }, status: { in: ["POSTED", "REVERSED"] }, postingDate: { lte: to } } }, select: { accountId: true, debit: true, credit: true, entry: { select: { postingDate: true } } } });
  const amounts = new Map<string, { opening: bigint; debit: bigint; credit: bigint }>();
  for (const line of lines) {
    const current = amounts.get(line.accountId) ?? { opening: BigInt(0), debit: BigInt(0), credit: BigInt(0) };
    const debit = parseMoney(line.debit.toString(), precision).minor; const credit = parseMoney(line.credit.toString(), precision).minor;
    if (line.entry.postingDate < from) current.opening += debit - credit;
    else { current.debit += debit; current.credit += credit; }
    amounts.set(line.accountId, current);
  }
  const rows = accounts.map(account => {
    const value = amounts.get(account.id) ?? { opening: BigInt(0), debit: BigInt(0), credit: BigInt(0) };
    const closing = value.opening + value.debit - value.credit;
    const openingSides = side(value.opening, precision); const closingSides = side(closing, precision);
    return { ...account, openingDebit: openingSides.debit, openingCredit: openingSides.credit, periodDebit: formatMinor(value.debit, precision), periodCredit: formatMinor(value.credit, precision), closingDebit: closingSides.debit, closingCredit: closingSides.credit };
  }).filter(row => [row.openingDebit, row.openingCredit, row.periodDebit, row.periodCredit, row.closingDebit, row.closingCredit].some(value => parseMoney(value, precision).minor !== BigInt(0)));

  const sum = (selector: (row: typeof rows[number]) => string) => formatMinor(rows.reduce((total, row) => total + parseMoney(selector(row), precision).minor, BigInt(0)), precision);
  const totals = { openingDebit: sum(row => row.openingDebit), openingCredit: sum(row => row.openingCredit), periodDebit: sum(row => row.periodDebit), periodCredit: sum(row => row.periodCredit), closingDebit: sum(row => row.closingDebit), closingCredit: sum(row => row.closingCredit) };
  const classOrder = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
  const summary = classOrder.map(accountClass => {
    const selected = rows.filter(row => row.accountClass === accountClass);
    const classSum = (selector: (row: typeof rows[number]) => string) => formatMinor(selected.reduce((total, row) => total + parseMoney(selector(row), precision).minor, BigInt(0)), precision);
    return { accountClass, accountCount: selected.length, openingDebit: classSum(row => row.openingDebit), openingCredit: classSum(row => row.openingCredit), periodDebit: classSum(row => row.periodDebit), periodCredit: classSum(row => row.periodCredit), closingDebit: classSum(row => row.closingDebit), closingCredit: classSum(row => row.closingCredit) };
  }).filter(row => row.accountCount > 0);
  return { fiscalYear, currency, precision, from, to, rows, summary, totals, reconciled: totals.openingDebit === totals.openingCredit && totals.periodDebit === totals.periodCredit && totals.closingDebit === totals.closingCredit, view: input.view ?? "DETAILED" };
}
