import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo, type TrimListEntry } from '../data';
import { useTrimList } from '../data/hooks';
import { formatDate } from '../lib/dates';
import { go } from '../lib/router';
import { Button, DemoBadge, inputClass } from '../components/ui';

export function ToTrim() {
  const { farm, toast } = useApp();
  const list = useTrimList(farm.id);
  const [text, setText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState('');

  if (!list) return <p>Loading…</p>;
  const todo = list.filter((e) => e.item.status === 'todo');
  const finished = list.filter((e) => e.item.status !== 'todo');
  const trimmed = list.filter((e) => e.item.status === 'done').length;
  const addOpen = showAdd || list.length === 0;

  const add = async () => {
    try {
      const r = await repo.addToTrimList(farm.id, text);
      const parts = [`${r.added.length} added`];
      if (r.newCows.length) parts.push(`${r.newCows.length} new cow(s) created: ${r.newCows.join(', ')}`);
      if (r.alreadyOnList.length) parts.push(`already on the list: ${r.alreadyOnList.join(', ')}`);
      setMsg(parts.join(' · '));
      setText('');
      setShowAdd(true); // keep the panel (and this message) visible after the first cows are added
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const share = async () => {
    const body = `Cows to trim – ${farm.name}:\n${todo.map((e) => e.cow.number).join('\n')}`;
    try {
      if (navigator.share) await navigator.share({ text: body });
      else { await navigator.clipboard.writeText(body); toast({ message: 'List copied – paste it in WhatsApp or a text message' }); }
    } catch { /* user cancelled */ }
  };

  const clearFinished = async () => {
    const snap = await repo.clearFinishedTrimList(farm.id);
    toast({ message: `${snap.trimList.length} finished cow(s) cleared`, actionLabel: 'Undo', onAction: () => repo.restore(snap) });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">To trim</h1>
      {list.length > 0 && (
        <div className="mt-2">
          <p className="text-lg font-bold">{trimmed} of {list.length} trimmed{finished.length - trimmed > 0 && ` · ${finished.length - trimmed} not possible`}</p>
          <div className="mt-1 h-4 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
            <div className="h-full bg-green-700" style={{ width: `${(finished.length / list.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* The farm's part: put cows on the list */}
      {addOpen ? (
        <section className="mt-4 rounded-2xl border-2 border-neutral-400 p-3 dark:border-neutral-600">
          <h2 className="text-lg font-extrabold">Add cows to the list</h2>
          <p className="text-neutral-700 dark:text-neutral-300">Type or paste cow numbers, <b>one per line</b>. You can paste a list from WhatsApp or a text message.</p>
          <textarea
            className={`${inputClass} mt-2 min-h-32 py-2 font-bold`}
            placeholder={'1234\n5678\nNL 1234 5678 9'}
            value={text}
            onChange={(e) => { setText(e.target.value); setMsg(''); }}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {list.length > 0 && <Button onClick={() => { setShowAdd(false); setMsg(''); }}>Close</Button>}
            <Button variant="primary" className={list.length > 0 ? '' : 'col-span-2'} disabled={!text.trim()} onClick={add}>Add to list</Button>
          </div>
          {msg && <p className="mt-2 font-semibold">{msg}</p>}
        </section>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => setShowAdd(true)}>+ Add cows</Button>
          <Button onClick={share} disabled={todo.length === 0}>Share list</Button>
        </div>
      )}

      {/* The trimmer's part: tick them off */}
      {list.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold tracking-wide uppercase">Still to trim ({todo.length})</h2>
          {todo.length === 0 && <p className="rounded-xl bg-green-100 p-3 text-lg font-bold text-green-900 dark:bg-green-950 dark:text-green-100">✓ All cows on the list are done.</p>}
          <ul className="space-y-3">
            {todo.map((e) => <TodoRow key={e.item.id} entry={e} farmId={farm.id} />)}
          </ul>
        </section>
      )}

      {finished.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide uppercase">Finished ({finished.length})</h2>
            <button type="button" onClick={clearFinished} className="min-h-12 rounded-xl border-2 border-neutral-400 px-3 font-semibold dark:border-neutral-600">Clear finished</button>
          </div>
          <ul className="space-y-2">
            {finished.map(({ item, cow }) => (
              <li key={item.id} className={`flex items-center gap-2 rounded-xl border-2 border-l-8 p-2 pl-3 ${item.status === 'done' ? 'border-green-700' : 'border-orange-500'}`}>
                <span className="flex-1">
                  <span className="block text-xl font-extrabold">{cow.number}{cow.isDemo && <DemoBadge />}</span>
                  <span className="font-semibold">
                    {item.status === 'done' ? '✓ Trimmed' : '✗ Not possible'}{item.resolvedOn && ` · ${formatDate(item.resolvedOn)}`}
                  </span>
                </span>
                <button type="button" onClick={() => repo.setTrimStatus(item.farmId, item.id, 'todo')} className="min-h-12 rounded-xl border-2 border-neutral-400 px-3 font-semibold dark:border-neutral-600">
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TodoRow({ entry, farmId }: { entry: TrimListEntry; farmId: string }) {
  const { item, cow } = entry;
  return (
    <li className="rounded-xl border-2 border-neutral-400 p-3 dark:border-neutral-600">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-extrabold">{cow.number}{cow.isDemo && <DemoBadge />}</span>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">added {formatDate(item.addedOn)}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => repo.setTrimStatus(farmId, item.id, 'done')}
          className="min-h-16 rounded-xl border-2 border-green-800 bg-green-800 text-xl font-extrabold text-white active:scale-[0.98]"
        >
          ✓ Trimmed
        </button>
        <button
          type="button"
          onClick={() => repo.setTrimStatus(farmId, item.id, 'notDone')}
          className="min-h-16 rounded-xl border-2 border-neutral-950 text-lg font-bold dark:border-white active:scale-[0.98]"
        >
          ✗ Not possible
        </button>
      </div>
      <div className="mt-2 flex justify-between gap-2">
        <button type="button" onClick={() => go(`/trim/${cow.id}`)} className="min-h-12 font-semibold text-green-800 underline dark:text-green-400">
          Record trim details →
        </button>
        <button type="button" onClick={() => repo.removeFromTrimList(farmId, item.id)} className="min-h-12 px-2 font-semibold text-red-700 underline dark:text-red-400">
          Remove
        </button>
      </div>
    </li>
  );
}
