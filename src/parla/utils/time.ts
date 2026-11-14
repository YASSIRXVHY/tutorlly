/** Date & time helpers — everything the timetable needs. */

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Local YYYY-MM-DD for a Date. */
export function dateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a local YYYY-MM-DD into a Date at midnight (no timezone drift). */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "Tue 14 May" — timetable shorthand. */
export function shortDate(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(iso: string): string {
  const d = fromISO(iso);
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
  return `${wd} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Build the exact Date at which a lesson slot starts, local time. */
export function slotDate(iso: string, hour: number): Date {
  const d = fromISO(iso);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Chat grouping label: Today / Yesterday / "Wed 12 Mar". */
export function dayDividerLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = addDays(today, -1);
  if (dateISO(d) === dateISO(today)) return "Today";
  if (dateISO(d) === dateISO(yesterday)) return "Yesterday";
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Review timestamp label: "12 Mar" or "3 Feb 2024". */
export function reviewDateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return sameYear ? label : `${label} ${d.getFullYear()}`;
}

/** Split remaining ms into clock parts. */
export function countdownParts(remainMs: number) {
  const clamped = Math.max(0, remainMs);
  const totalSec = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalSec,
    done: clamped <= 0,
  };
}

/** Zero-padded HH:MM:SS clock string. */
export function hhmmss(remainMs: number): string {
  const p = countdownParts(remainMs);
  const h = String(p.hours + p.days * 24).padStart(2, "0");
  return `${h}:${String(p.minutes).padStart(2, "0")}:${String(p.seconds).padStart(2, "0")}`;
}

/** The student's timezone label for booking microcopy. */
export function timezoneLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return `${tz} (GMT${sign}${hh}:${mm})`;
  } catch {
    return "your local time";
  }
}

/** Friendly time-of-day bucket for slots. */
export function timeBucket(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
