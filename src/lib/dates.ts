/**
 * The school operates in IST (Asia/Kolkata). Servers (Vercel) run in UTC and
 * a user's device clock may be set to any timezone, so "what date is it
 * today?" must always be answered against the school's timezone. Deriving the
 * calendar date from the raw clock (e.g. `new Date().toISOString().slice(0,
 * 10)`) yields the UTC date, which lags IST by a day between 00:00 and
 * 05:30 IST.
 */
const SCHOOL_TIME_ZONE = "Asia/Kolkata";

/** Today's date as YYYY-MM-DD in the school's timezone. */
export function todayISO(): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
  }).format(new Date());
}

/** Current calendar date parts in the school's timezone. `month` is 1–12. */
export function todayParts(): { year: number; month: number; day: number } {
  const [year, month, day] = todayISO().split("-").map(Number);
  return { year, month, day };
}
