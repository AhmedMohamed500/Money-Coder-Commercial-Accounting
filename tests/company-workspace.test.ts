import { describe, expect, it } from "vitest";
import { cairoDayStartUtc, nextCalendarDay } from "@/lib/accounting/cairo-date";

describe("Cairo audit calendar filtering", () => {
  it("uses the actual winter and summer UTC offsets and exclusive next-day boundaries", () => {
    expect(cairoDayStartUtc("2026-01-15")?.toISOString()).toBe("2026-01-14T22:00:00.000Z");
    expect(cairoDayStartUtc("2026-07-15")?.toISOString()).toBe("2026-07-14T21:00:00.000Z");
    expect(cairoDayStartUtc("2026-04-24")?.toISOString()).toBe("2026-04-23T22:00:00.000Z");
    expect(cairoDayStartUtc("2026-10-30")?.toISOString()).toBe("2026-10-29T22:00:00.000Z");
    expect(nextCalendarDay("2026-12-31")).toBe("2027-01-01");
    expect(cairoDayStartUtc(nextCalendarDay("2026-12-31")!)?.toISOString()).toBe("2026-12-31T22:00:00.000Z");
  });

  it("rejects invalid dates instead of widening an audit search", () => {
    expect(cairoDayStartUtc("2026-02-30")).toBeNull();
    expect(cairoDayStartUtc("2026/02/02")).toBeNull();
    expect(nextCalendarDay("invalid")).toBeNull();
  });
});
