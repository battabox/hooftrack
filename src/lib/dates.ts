// All dates in HoofTrack are calendar dates ("YYYY-MM-DD") as seen in Europe/Amsterdam.
// Arithmetic is done on pure calendar days (UTC midnight), so DST changes and month/year
// ends never shift a date.

export const TIME_ZONE = 'Europe/Amsterdam';
const DAY_MS = 86_400_000;

export type Recheck =
  | { kind: 'none' }
  | { kind: 'weeks'; weeks: number }
  | { kind: 'date'; date: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's calendar date in Amsterdam. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return fromMs(toMs(iso)) === iso; // rejects 2026-02-30 etc.
}

export function addDays(iso: string, days: number): string {
  return fromMs(toMs(iso) + days * DAY_MS);
}

export function addWeeks(iso: string, weeks: number): string {
  return addDays(iso, weeks * 7);
}

/** Whole days from a to b (positive if b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(iso: string): number {
  return (new Date(toMs(iso)).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

/**
 * Next check date for a visit. Returns null for "no recheck".
 * Throws on invalid input so a bad date can never be saved.
 */
export function nextCheckDate(visitDate: string, recheck: Recheck): string | null {
  if (!isValidISODate(visitDate)) throw new Error(`Invalid visit date: ${visitDate}`);
  switch (recheck.kind) {
    case 'none':
      return null;
    case 'weeks':
      if (!Number.isInteger(recheck.weeks) || recheck.weeks < 1 || recheck.weeks > 52) {
        throw new Error('Weeks must be a whole number between 1 and 52');
      }
      return addWeeks(visitDate, recheck.weeks);
    case 'date':
      if (!isValidISODate(recheck.date)) throw new Error(`Invalid recheck date: ${recheck.date}`);
      if (recheck.date <= visitDate) throw new Error('Recheck date must be after the visit date');
      return recheck.date;
  }
}

export type DueBucket = 'overdue' | 'thisWeek' | 'nextWeek' | 'later';

/** Weeks run Monday–Sunday. Due today counts as "this week". */
export function dueBucket(due: string, today: string): DueBucket {
  if (due < today) return 'overdue';
  const endThis = addDays(startOfWeek(today), 6);
  if (due <= endThis) return 'thisWeek';
  if (due <= addDays(endThis, 7)) return 'nextWeek';
  return 'later';
}

export function formatDate(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(toMs(iso)));
}

export function relativeDue(due: string, today: string): string {
  const d = diffDays(today, due);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return '1 day overdue';
  return d < 0 ? `${-d} days overdue` : `in ${d} days`;
}
