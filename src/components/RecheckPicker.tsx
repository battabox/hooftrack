import { useState } from 'react';
import { isValidISODate, nextCheckDate, type Recheck } from '../lib/dates';
import { useL, type Key } from '../lib/i18n';
import { Choice, inputClass } from './ui';

const QUICK: { label: Key; r: Recheck }[] = [
  { label: 'recheck.none', r: { kind: 'none' } },
  { label: 'recheck.w1', r: { kind: 'weeks', weeks: 1 } },
  { label: 'recheck.w2', r: { kind: 'weeks', weeks: 2 } },
  { label: 'recheck.w3', r: { kind: 'weeks', weeks: 3 } },
];

const same = (a: Recheck, b: Recheck) =>
  a.kind === b.kind && (a.kind !== 'weeks' || (b.kind === 'weeks' && a.weeks === b.weeks));

/** Nothing is selected until the user taps a choice (value === null). */
export function RecheckPicker(props: { value: Recheck | null; onChange: (r: Recheck | null) => void; baseDate: string }) {
  const { value, onChange, baseDate } = props;
  const l = useL();
  const [custom, setCustom] = useState(false);
  const [mode, setMode] = useState<'weeks' | 'date'>('weeks');
  const [weeksText, setWeeksText] = useState('');
  const [dateText, setDateText] = useState('');
  const [error, setError] = useState<Key | ''>('');

  const applyWeeks = (txt: string) => {
    setWeeksText(txt);
    const n = Number(txt);
    if (txt && Number.isInteger(n) && n >= 1 && n <= 52) { setError(''); onChange({ kind: 'weeks', weeks: n }); }
    else { setError(txt ? 'recheck.errWeeks' : ''); onChange(null); }
  };
  const applyDate = (txt: string) => {
    setDateText(txt);
    if (isValidISODate(txt) && txt > baseDate) { setError(''); onChange({ kind: 'date', date: txt }); }
    else { setError(txt ? 'recheck.errDate' : ''); onChange(null); }
  };

  let next: string | null | undefined;
  try { next = value ? nextCheckDate(baseDate, value) : undefined; } catch { next = undefined; }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {QUICK.map((q) => (
          <Choice key={q.label} selected={!custom && !!value && same(value, q.r)} onClick={() => { setCustom(false); setError(''); onChange(q.r); }}>
            {l.t(q.label)}
          </Choice>
        ))}
        <Choice
          className="col-span-2"
          selected={custom}
          onClick={() => { setCustom(true); mode === 'weeks' ? applyWeeks(weeksText) : applyDate(dateText); }}
        >
          {l.t('recheck.custom')}
        </Choice>
      </div>
      {custom && (
        <div className="mt-3 rounded-xl border-2 border-neutral-300 p-3 dark:border-neutral-700">
          <div className="grid grid-cols-2 gap-2">
            <Choice selected={mode === 'weeks'} onClick={() => { setMode('weeks'); applyWeeks(weeksText); }}>{l.t('recheck.inWeeks')}</Choice>
            <Choice selected={mode === 'date'} onClick={() => { setMode('date'); applyDate(dateText); }}>{l.t('recheck.onDate')}</Choice>
          </div>
          <div className="mt-2">
            {mode === 'weeks' ? (
              <input className={inputClass} inputMode="numeric" placeholder={l.t('recheck.weeksPh')} value={weeksText} onChange={(e) => applyWeeks(e.target.value.trim())} />
            ) : (
              <input className={inputClass} type="date" min={baseDate} value={dateText} onChange={(e) => applyDate(e.target.value)} />
            )}
          </div>
          {error && <p className="mt-2 font-semibold text-red-700 dark:text-red-400">{l.t(error)}</p>}
        </div>
      )}
      {value && (
        <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-lg font-bold dark:bg-neutral-800">
          {next ? l.t('recheck.next', { date: l.date(next) }) : l.t('recheck.nonePlanned')}
        </p>
      )}
    </div>
  );
}
