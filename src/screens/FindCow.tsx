import { useState } from 'react';
import { useApp } from '../AppContext';
import { DuplicateCowError, repo } from '../data';
import { useCowSearch } from '../data/hooks';
import { cowNumberKey, displayCowNumber } from '../data/repo';
import { useL } from '../lib/i18n';
import { go } from '../lib/router';
import { Button, DemoBadge, inputClass } from '../components/ui';
import { NumberCapture } from '../components/NumberCapture';

export function FindCow() {
  const { farm } = useApp();
  const l = useL();
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const results = useCowSearch(farm.id, q);
  const key = cowNumberKey(q);
  const exact = results?.find((c) => c.numberKey === key);

  const add = async () => {
    setError('');
    try {
      const cow = await repo.addCow(farm.id, q);
      go(`/trim/${cow.id}`);
    } catch (e) {
      if (e instanceof DuplicateCowError) setError(l.t('find.dup', { cow: e.existing.number }));
      else setError(l.err(e));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{l.t('find.title')}</h1>
      <form
        className="mt-3"
        onSubmit={(e) => { e.preventDefault(); if (exact) go(`/trim/${exact.id}`); else if (key) add(); }}
      >
        <label htmlFor="cowq" className="mb-1 block font-semibold">{l.t('find.label')}</label>
        <input
          id="cowq"
          className={`${inputClass} text-2xl font-bold`}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          enterKeyHint="go"
          placeholder={l.t('find.ph')}
          value={q}
          onChange={(e) => { setQ(e.target.value); setError(''); }}
        />
      </form>
      <NumberCapture single onNumbers={(nums) => { setQ(nums[0]); setError(''); }} />

      {key && !exact && (
        <Button variant="primary" className="mt-3 w-full text-xl" onClick={add}>
          {l.t('find.add', { cow: displayCowNumber(q) })}
        </Button>
      )}
      {error && <p className="mt-3 rounded-xl border-2 border-red-700 p-3 font-bold text-red-700 dark:text-red-400">{error}</p>}

      <ul className="mt-4 space-y-2">
        {results?.slice(0, 50).map((c) => (
          <li key={c.id} className="flex gap-2">
            <button
              type="button"
              onClick={() => go(`/trim/${c.id}`)}
              className="flex min-h-16 flex-1 items-center justify-between gap-2 rounded-xl border-2 border-neutral-400 bg-white px-4 text-left dark:border-neutral-600 dark:bg-neutral-900"
            >
              <span className="text-2xl font-extrabold">{c.number}{c.isDemo && <DemoBadge />}</span>
              <span className="font-bold text-green-800 dark:text-green-400">{l.t('find.record')}</span>
            </button>
            <button
              type="button"
              onClick={() => go(`/cow/${c.id}`)}
              className="min-h-16 rounded-xl border-2 border-neutral-400 px-3 font-semibold dark:border-neutral-600"
            >
              {l.t('find.history')}
            </button>
          </li>
        ))}
      </ul>
      {results && results.length === 0 && !key && (
        <p className="mt-6 text-neutral-600 dark:text-neutral-300">{l.t('find.empty')}</p>
      )}
    </div>
  );
}
