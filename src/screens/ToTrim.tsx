import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo, type TrimListEntry } from '../data';
import { useTrimList } from '../data/hooks';
import { useL } from '../lib/i18n';
import { go } from '../lib/router';
import { Button, DemoBadge, inputClass } from '../components/ui';
import { NumberCapture } from '../components/NumberCapture';

export function ToTrim() {
  const { farm, toast } = useApp();
  const l = useL();
  const list = useTrimList(farm.id);
  const [text, setText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState('');

  if (!list) return <p>{l.t('app.loading')}</p>;
  const todo = list.filter((e) => e.item.status === 'todo');
  const finished = list.filter((e) => e.item.status !== 'todo');
  const trimmed = list.filter((e) => e.item.status === 'done').length;
  const notPossible = finished.length - trimmed;
  const addOpen = showAdd || list.length === 0;

  const add = async () => {
    try {
      const r = await repo.addToTrimList(farm.id, text);
      const parts = [l.t('list.rAdded', { n: r.added.length })];
      if (r.newCows.length) parts.push(l.t('list.rNew', { n: r.newCows.length, list: r.newCows.join(', ') }));
      if (r.alreadyOnList.length) parts.push(l.t('list.rAlready', { list: r.alreadyOnList.join(', ') }));
      setMsg(parts.join(' · '));
      setText('');
      setShowAdd(true); // keep the panel (and this message) visible after the first cows are added
    } catch (e) {
      setMsg(l.err(e));
    }
  };

  const share = async () => {
    const body = `${l.t('list.shareText', { farm: farm.name })}\n${todo.map((e) => e.cow.number).join('\n')}`;
    try {
      if (navigator.share) await navigator.share({ text: body });
      else { await navigator.clipboard.writeText(body); toast({ message: l.t('list.copied') }); }
    } catch { /* user cancelled */ }
  };

  const clearFinished = async () => {
    const snap = await repo.clearFinishedTrimList(farm.id);
    toast({ message: l.t('list.cleared', { n: snap.trimList.length }), actionLabel: l.t('common.undo'), onAction: () => repo.restore(snap) });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{l.t('list.title')}</h1>
      {list.length > 0 && (
        <div className="mt-2">
          <p className="text-lg font-bold">
            {l.t('list.progress', { done: trimmed, total: list.length })}
            {notPossible > 0 && ` · ${l.t('list.notPossibleCount', { n: notPossible })}`}
          </p>
          <div className="mt-1 h-4 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
            <div className="h-full bg-green-700" style={{ width: `${(finished.length / list.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* The farm's part: put cows on the list */}
      {addOpen ? (
        <section className="mt-4 rounded-2xl border-2 border-neutral-400 p-3 dark:border-neutral-600">
          <h2 className="text-lg font-extrabold">{l.t('list.addTitle')}</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{l.t('list.addHelp')}</p>
          <NumberCapture
            onNumbers={(nums) => {
              setMsg('');
              setText((cur) => (cur.trim() ? `${cur.trimEnd()}\n` : '') + nums.join('\n'));
            }}
          />
          <textarea
            className={`${inputClass} mt-2 min-h-32 py-2 font-bold`}
            placeholder={'1234\n5678\nNL 1234 5678 9'}
            value={text}
            onChange={(e) => { setText(e.target.value); setMsg(''); }}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {list.length > 0 && <Button onClick={() => { setShowAdd(false); setMsg(''); }}>{l.t('common.close')}</Button>}
            <Button variant="primary" className={list.length > 0 ? '' : 'col-span-2'} disabled={!text.trim()} onClick={add}>{l.t('list.addBtn')}</Button>
          </div>
          {msg && <p className="mt-2 font-semibold">{msg}</p>}
        </section>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => setShowAdd(true)}>{l.t('list.addCows')}</Button>
          <Button onClick={share} disabled={todo.length === 0}>{l.t('list.share')}</Button>
        </div>
      )}

      {/* The trimmer's part: tick them off */}
      {list.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold tracking-wide uppercase">{l.t('list.stillTodo', { n: todo.length })}</h2>
          {todo.length === 0 && <p className="rounded-xl bg-green-100 p-3 text-lg font-bold text-green-900 dark:bg-green-950 dark:text-green-100">{l.t('list.allDone')}</p>}
          <ul className="space-y-3">
            {todo.map((e) => <TodoRow key={e.item.id} entry={e} farmId={farm.id} />)}
          </ul>
        </section>
      )}

      {finished.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold tracking-wide uppercase">{l.t('list.finished', { n: finished.length })}</h2>
            <button type="button" onClick={clearFinished} className="min-h-12 rounded-xl border-2 border-neutral-400 px-3 font-semibold dark:border-neutral-600">{l.t('list.clear')}</button>
          </div>
          <ul className="space-y-2">
            {finished.map(({ item, cow }) => (
              <li key={item.id} className={`flex items-center gap-2 rounded-xl border-2 border-l-8 p-2 pl-3 ${item.status === 'done' ? 'border-green-700' : 'border-orange-500'}`}>
                <span className="flex-1">
                  <span className="block text-xl font-extrabold">{cow.number}{cow.isDemo && <DemoBadge />}</span>
                  <span className="font-semibold">
                    {item.status === 'done' ? l.t('list.trimmed') : l.t('list.notPossible')}{item.resolvedOn && ` · ${l.date(item.resolvedOn)}`}
                  </span>
                </span>
                <button type="button" onClick={() => repo.setTrimStatus(item.farmId, item.id, 'todo')} className="min-h-12 rounded-xl border-2 border-neutral-400 px-3 font-semibold dark:border-neutral-600">
                  {l.t('common.undo')}
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
  const l = useL();
  return (
    <li className="rounded-xl border-2 border-neutral-400 p-3 dark:border-neutral-600">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-extrabold">{cow.number}{cow.isDemo && <DemoBadge />}</span>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{l.t('list.added', { date: l.date(item.addedOn) })}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => repo.setTrimStatus(farmId, item.id, 'done')}
          className="min-h-16 rounded-xl border-2 border-green-800 bg-green-800 text-xl font-extrabold text-white active:scale-[0.98]"
        >
          {l.t('list.trimmed')}
        </button>
        <button
          type="button"
          onClick={() => repo.setTrimStatus(farmId, item.id, 'notDone')}
          className="min-h-16 rounded-xl border-2 border-neutral-950 text-lg font-bold dark:border-white active:scale-[0.98]"
        >
          {l.t('list.notPossible')}
        </button>
      </div>
      <div className="mt-2 flex justify-between gap-2">
        <button type="button" onClick={() => go(`/trim/${cow.id}`)} className="min-h-12 text-left font-semibold text-green-800 underline dark:text-green-400">
          {l.t('list.recordDetails')}
        </button>
        <button type="button" onClick={() => repo.removeFromTrimList(farmId, item.id)} className="min-h-12 px-2 font-semibold text-red-700 underline dark:text-red-400">
          {l.t('list.remove')}
        </button>
      </div>
    </li>
  );
}
