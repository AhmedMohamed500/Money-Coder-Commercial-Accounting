const cairoCalendar = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function cairoDateAt(timestamp: number): string {
  const parts = cairoCalendar.formatToParts(new Date(timestamp));
  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  const day = parts.find(part => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/** First UTC instant in the selected Cairo calendar day, including DST changes at midnight. */
export function cairoDayStartUtc(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const check = new Date(utcMidnight);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  let before = utcMidnight - 86_400_000;
  let onOrAfter = utcMidnight + 86_400_000;
  while (onOrAfter - before > 1) {
    const middle = before + Math.floor((onOrAfter - before) / 2);
    if (cairoDateAt(middle) >= value) onOrAfter = middle;
    else before = middle;
  }
  return cairoDateAt(onOrAfter) === value ? new Date(onOrAfter) : null;
}

export function nextCalendarDay(value: string): string | null {
  if (!cairoDayStartUtc(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
