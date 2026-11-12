import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo } from '../data';
import { useFarms } from '../data/hooks';
import { useL } from '../lib/i18n';
import { go } from '../lib/router';
import { Button, inputClass } from '../components/ui';

export function Farms() {
  const { farm, selectFarm, toast } = useApp();
  const l = useL();
  const farms = useFarms();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const remove = async (id: string, farmName: string) => {
    try {
      const { cows, visits } = await repo.countFarmData(id);
      if (!confirm(l.t('farms.confirmDelete', { farm: farmName, cows, visits }))) return;
      const snap = await repo.deleteFarm(id);
      if (id === farm.id) {
        const next = farms?.find((f) => f.id !== id);
        if (next) selectFarm(next.id);
      }
      toast({ message: l.t('farms.deleted', { farm: farmName }), actionLabel: l.t('common.undo'), onAction: () => repo.restore(snap) });
    } catch (e) {
      alert(l.err(e));
    }
  };

  const add = async () => {
    try {
      const f = await repo.addFarm(name);
      setName('');
      setError('');
      selectFarm(f.id);
      toast({ message: l.t('farms.added', { farm: f.name }) });
    } catch (e) {
      setError(l.err(e));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{l.t('farms.title')}</h1>
      <p className="mt-1 text-neutral-600 dark:text-neutral-300">{l.t('farms.sub')}</p>
      <ul className="mt-3 space-y-2">
        {farms?.map((f) => {
          const on = f.id === farm.id;
          return (
            <li key={f.id} className="flex gap-2">
              <button
                type="button"
                onClick={() => { selectFarm(f.id); go('/'); }}
                className={`flex min-h-16 flex-1 items-center justify-between gap-2 rounded-xl border-2 px-4 text-left text-xl font-bold ${
                  on ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-400 dark:border-neutral-600'
                }`}
              >
                {f.name}
                {on && <span className="shrink-0 text-base">{l.t('farms.current')}</span>}
              </button>
              {(farms?.length ?? 0) > 1 && (
                <button
                  type="button"
                  aria-label={l.t('farms.deleteAria', { farm: f.name })}
                  onClick={() => remove(f.id, f.name)}
                  className="min-h-16 rounded-xl border-2 border-red-700 px-3 font-semibold text-red-700 dark:border-red-400 dark:text-red-400"
                >
                  {l.t('common.delete')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label htmlFor="fname" className="mb-1 block font-semibold">{l.t('farms.addLabel')}</label>
        <div className="flex gap-2">
          <input id="fname" className={inputClass} placeholder={l.t('farms.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!name.trim()}>{l.t('common.add')}</Button>
        </div>
        {error && <p className="mt-2 font-semibold text-red-700 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}
