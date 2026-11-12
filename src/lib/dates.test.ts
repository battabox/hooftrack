import { describe, expect, it } from 'vitest';
import { addWeeks, dueBucket, isValidISODate, nextCheckDate, todayISO } from './dates';

describe('nextCheckDate', () => {
  it('returns null for no recheck', () => {
    expect(nextCheckDate('2026-11-12', { kind: 'none' })).toBeNull();
  });

  it('adds 1, 2 and 3 weeks', () => {
    expect(nextCheckDate('2026-11-12', { kind: 'weeks', weeks: 1 })).toBe('2026-11-19');
    expect(nextCheckDate('2026-11-12', { kind: 'weeks', weeks: 2 })).toBe('2026-11-26');
    expect(nextCheckDate('2026-11-12', { kind: 'weeks', weeks: 3 })).toBe('2026-12-03');
  });

  it('handles month ends, year ends and leap years', () => {
    expect(nextCheckDate('2026-01-28', { kind: 'weeks', weeks: 1 })).toBe('2026-02-04');
    expect(nextCheckDate('2026-02-25', { kind: 'weeks', weeks: 1 })).toBe('2026-03-04'); // non-leap
    expect(nextCheckDate('2028-02-25', { kind: 'weeks', weeks: 1 })).toBe('2028-03-03'); // leap year
    expect(nextCheckDate('2026-04-30', { kind: 'weeks', weeks: 1 })).toBe('2026-05-07');
    expect(nextCheckDate('2026-12-24', { kind: 'weeks', weeks: 2 })).toBe('2027-01-07');
  });

  it('is not shifted by daylight saving changes (Amsterdam: 29 Mar and 25 Oct 2026)', () => {
    expect(nextCheckDate('2026-03-25', { kind: 'weeks', weeks: 1 })).toBe('2026-04-01');
    expect(nextCheckDate('2026-10-22', { kind: 'weeks', weeks: 1 })).toBe('2026-10-29');
  });

  it('supports custom weeks and custom dates', () => {
    expect(nextCheckDate('2026-11-12', { kind: 'weeks', weeks: 6 })).toBe('2026-12-24');
    expect(nextCheckDate('2026-11-12', { kind: 'date', date: '2026-12-01' })).toBe('2026-12-01');
  });

  it('rejects invalid input', () => {
    expect(() => nextCheckDate('2026-11-12', { kind: 'weeks', weeks: 0 })).toThrow();
    expect(() => nextCheckDate('2026-11-12', { kind: 'weeks', weeks: 1.5 })).toThrow();
    expect(() => nextCheckDate('2026-11-12', { kind: 'date', date: '2026-11-12' })).toThrow();
    expect(() => nextCheckDate('2026-11-12', { kind: 'date', date: '2026-02-30' })).toThrow();
    expect(() => nextCheckDate('2026-13-01', { kind: 'none' })).toThrow();
  });
});

describe('todayISO (Europe/Amsterdam)', () => {
  it('uses Amsterdam, not UTC, around midnight', () => {
    // 23:30 UTC in winter = 00:30 next day in Amsterdam (UTC+1)
    expect(todayISO(new Date('2026-11-30T23:30:00Z'))).toBe('2026-12-01');
    expect(todayISO(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    // 22:30 UTC in summer = 00:30 next day in Amsterdam (UTC+2)
    expect(todayISO(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01');
    // Still the same day just before midnight
    expect(todayISO(new Date('2026-06-30T21:59:00Z'))).toBe('2026-06-30');
  });
});

describe('helpers', () => {
  it('validates dates', () => {
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
  });
  it('adds weeks across months', () => {
    expect(addWeeks('2026-01-31', 4)).toBe('2026-02-28');
  });
  it('buckets due dates by Monday–Sunday week', () => {
    const today = '2026-11-12'; // Thursday
    expect(dueBucket('2026-11-11', today)).toBe('overdue');
    expect(dueBucket('2026-11-12', today)).toBe('thisWeek');
    expect(dueBucket('2026-11-15', today)).toBe('thisWeek'); // Sunday
    expect(dueBucket('2026-11-16', today)).toBe('nextWeek'); // Monday
    expect(dueBucket('2026-11-22', today)).toBe('nextWeek');
    expect(dueBucket('2026-11-23', today)).toBe('later');
  });
});
