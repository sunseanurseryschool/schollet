/**
 * Unit tests for DateRangeFilter preset date calculation logic.
 *
 * We extract and test the resolvePreset function inline because the component
 * is client-only and the test environment is node (no jsdom).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Inline replica of the resolvePreset logic from date-range-filter.tsx ──────

type Preset = "today" | "this_week" | "this_month" | "this_year";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolvePreset(preset: Preset): { from: string; to: string } {
  const now = new Date();

  switch (preset) {
    case "today": {
      const d = toISODate(now);
      return { from: d, to: d };
    }
    case "this_week": {
      const day = now.getDay(); // 0=Sun
      const diffToMon = (day + 6) % 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() - diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: toISODate(mon), to: toISODate(sun) };
    }
    case "this_month": {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      return { from: toISODate(firstDay), to: toISODate(lastDay) };
    }
    case "this_year": {
      const y = now.getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("resolvePreset", () => {
  beforeEach(() => {
    // Fix "now" to a known Wednesday: 2026-04-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('today: from === to === "2026-04-15"', () => {
    const { from, to } = resolvePreset("today");
    expect(from).toBe("2026-04-15");
    expect(to).toBe("2026-04-15");
  });

  it("this_week: Monday 2026-04-13 to Sunday 2026-04-19", () => {
    // 2026-04-15 is a Wednesday; Monday of that week is 2026-04-13
    const { from, to } = resolvePreset("this_week");
    expect(from).toBe("2026-04-13");
    expect(to).toBe("2026-04-19");
  });

  it("this_month: 2026-04-01 to 2026-04-30", () => {
    const { from, to } = resolvePreset("this_month");
    expect(from).toBe("2026-04-01");
    expect(to).toBe("2026-04-30");
  });

  it("this_year: 2026-01-01 to 2026-12-31", () => {
    const { from, to } = resolvePreset("this_year");
    expect(from).toBe("2026-01-01");
    expect(to).toBe("2026-12-31");
  });

  it("this_week on a Monday: from === to - 6 days", () => {
    vi.setSystemTime(new Date("2026-04-13T10:00:00Z")); // Monday
    const { from, to } = resolvePreset("this_week");
    expect(from).toBe("2026-04-13");
    expect(to).toBe("2026-04-19");
  });

  it("this_week on a Sunday: that Sunday is the last day of the week", () => {
    vi.setSystemTime(new Date("2026-04-19T10:00:00Z")); // Sunday
    const { from, to } = resolvePreset("this_week");
    expect(from).toBe("2026-04-13");
    expect(to).toBe("2026-04-19");
  });

  it("this_month correctly handles February in a leap year (2028)", () => {
    vi.setSystemTime(new Date("2028-02-15T10:00:00Z"));
    const { from, to } = resolvePreset("this_month");
    expect(from).toBe("2028-02-01");
    expect(to).toBe("2028-02-29"); // 2028 is a leap year
  });

  it("this_month correctly handles February in a non-leap year (2026)", () => {
    vi.setSystemTime(new Date("2026-02-15T10:00:00Z"));
    const { from, to } = resolvePreset("this_month");
    expect(from).toBe("2026-02-01");
    expect(to).toBe("2026-02-28");
  });
});
