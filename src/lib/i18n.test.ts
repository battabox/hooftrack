import { describe, expect, it } from 'vitest';
import { makeL } from './i18n';

const noop = () => {};

describe('translations', () => {
  it('fills in placeholders in both languages', () => {
    expect(makeL('en', noop).t('trim.cow', { cow: '12' })).toBe('Cow 12');
    expect(makeL('nl', noop).t('trim.cow', { cow: '12' })).toBe('Koe 12');
  });

  it('formats dates in the chosen language', () => {
    expect(makeL('en', noop).date('2026-11-12')).toMatch(/Thu.*12.*Nov.*2026/);
    expect(makeL('nl', noop).date('2026-11-12')).toMatch(/do.*12.*nov.*2026/);
  });

  it('translates default problem names but keeps names the user renamed', () => {
    const nl = makeL('nl', noop);
    const base = { kind: 'problem' as const, hidden: false, order: 1 };
    expect(nl.opt({ ...base, id: 'p-sole-ulcer', label: 'Sole ulcer' }, 'p-sole-ulcer')).toBe('Zoolzweer');
    expect(nl.opt({ ...base, id: 'p-sole-ulcer', label: 'Zoolzweer (eigen naam)' }, 'p-sole-ulcer')).toBe('Zoolzweer (eigen naam)');
    expect(nl.opt({ ...base, id: 'custom1', label: 'Kreupel' }, 'custom1')).toBe('Kreupel');
  });

  it('relative due text', () => {
    const nl = makeL('nl', noop);
    expect(nl.relDue('2026-11-10', '2026-11-12')).toBe('2 dagen te laat');
    expect(nl.relDue('2026-11-13', '2026-11-12')).toBe('morgen');
  });
});
