export class MoneyInputError extends Error {}

export function currencyPrecision(code: string): number {
  try { return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2; }
  catch { throw new MoneyInputError("رمز العملة غير صالح."); }
}

export function parseMoney(value: string, precision: number): { minor: bigint; text: string } {
  if (!Number.isInteger(precision) || precision < 0 || precision > 3) throw new MoneyInputError("دقة العملة غير مدعومة.");
  const normalized = value.trim().replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0)).replace(/٫/g, ".");
  if (!/^\d{1,16}(?:\.\d{1,3})?$/.test(normalized)) throw new MoneyInputError("أدخل مبلغًا موجبًا صحيحًا دون فواصل أو صيغة علمية.");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > precision) throw new MoneyInputError(`المبلغ يتجاوز دقة العملة (${precision} منازل عشرية).`);
  const minor = BigInt(whole) * BigInt(10) ** BigInt(precision) + BigInt(fraction.padEnd(precision, "0") || "0");
  return { minor, text: formatMinor(minor, precision) };
}

export function formatMinor(minor: bigint, precision: number): string {
  const scale = BigInt(10) ** BigInt(precision);
  const sign = minor < BigInt(0) ? "-" : "";
  const absolute = minor < BigInt(0) ? -minor : minor;
  return sign + (absolute / scale).toString() + (precision ? `.${(absolute % scale).toString().padStart(precision, "0")}` : "");
}

export function openingTotals(lines: Array<{ debit: string; credit: string }>, precision: number) {
  let debit = BigInt(0);
  let credit = BigInt(0);
  for (const line of lines) {
    debit += parseMoney(line.debit, precision).minor;
    credit += parseMoney(line.credit, precision).minor;
  }
  return { debit: formatMinor(debit, precision), credit: formatMinor(credit, precision), difference: formatMinor(debit - credit, precision), balanced: debit === credit };
}

export function validateSides(debit: string, credit: string, precision: number) {
  const left = parseMoney(debit || "0", precision);
  const right = parseMoney(credit || "0", precision);
  if (left.minor > BigInt(0) && right.minor > BigInt(0)) throw new MoneyInputError("الحساب لا يقبل مبلغًا مدينًا ودائنًا معًا في الدفعة نفسها.");
  return { debit: left.text, credit: right.text, empty: left.minor === BigInt(0) && right.minor === BigInt(0) };
}
