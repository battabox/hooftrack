import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo } from '../data';
import { useFarms } from '../data/hooks';
import { go } from '../lib/router';
import { Button, inputClass } from '../components/ui';

export function Farms() {
  const { farm, selectFarm, toast } = useApp();
  const farms = useFarms();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const add = async () => {
    try {
      const f = await repo.addFarm(name);
      setName('');
      setError('');
      selectFarm(f.id);
      toast({ message: `Farm “${f.name}” added and selected` });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Farms</h1>
      <p className="mt-1 text-neutral-600 dark:text-neutral-300">Tap a farm to work on it. Each farm’s cows are kept separate.</p>
      <ul className="mt-3 space-y-2">
        {farms?.map((f) => {
          const on = f.id === farm.id;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => { selectFarm(f.id); go('/'); }}
                className={`flex min-h-16 w-full items-center justify-between rounded-xl border-2 px-4 text-left text-xl font-bold ${
                  on ? 'border-green-800 bg-green-800 text-white' : 'border-neutral-400 dark:border-neutral-600'
                }`}
              >
                {f.name}
                {on && <span className="text-base">✓ Current</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label htmlFor="fname" className="mb-1 block font-semibold">Add a farm</label>
        <div className="flex gap-2">
          <input id="fname" className={inputClass} placeholder="Farm name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!name.trim()}>Add</Button>
        </div>
        {error && <p className="mt-2 font-semibold text-red-700 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}
