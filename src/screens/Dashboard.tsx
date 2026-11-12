import { useState } from 'react';
import { useApp } from '../AppContext';
import type { DueItem } from '../data';
import { useDue, useOptionMap } from '../data/hooks';
import { dueBucket, formatDate, relativeDue, todayISO, type DueBucket } from '../lib/dates';
import { footLine } from '../lib/format';
import { go } from '../lib/router';
import { MarkCheckedDialog } from '../components/MarkCheckedDialog';
import { Button, DemoBadge } from '../components/ui';

const SECTIONS: { bucket: DueBucket; title: string; head: string; bar: string }[] = [
  { bucket: 'overdue', title: 'Overdue', head: 'bg-red-700 text-white', bar: 'border-l-red-700' },
  { bucket: 'thisWeek', title: 'Due this week', head: 'bg-orange-500 text-black', bar: 'border-l-orange-500' },
  { bucket: 'nextWeek', title: 'Due next week', head: 'bg-green-700 text-white', bar: 'border-l-green-700' },
];

export function Dashboard() {
  const { farm } = useApp();
  const due = useDue(farm.id);
  const opts = useOptionMap();
  const [checking, setChecking] = useState<DueItem | null>(null);
  const today = todayISO();

  if (!due) return <p>Loading…</p>;
  const grouped = new Map<DueBucket, DueItem[]>();
  for (const item of due) {
    const b = dueBucket(item.visit.nextCheckDate!, today);
    grouped.set(b, [...(grouped.get(b) ?? []), item]);
  }
  const later = grouped.get('later')?.length ?? 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold">Rechecks</h1>
        <span className="font-semibold text-neutral-600 dark:text-neutral-300">Today: {formatDate(today)}</span>
      </div>
      <Button variant="primary" className="mt-3 w-full text-xl" onClick={() => go('/cows')}>+ Record a trim</Button>

      {SECTIONS.map((s) => {
        const items = grouped.get(s.bucket) ?? [];
        return (
          <section key={s.bucket} className="mt-5">
            <h2 className={`flex justify-between rounded-t-xl px-3 py-2 text-lg font-extrabold ${s.head}`}>
              <span>{s.title}</span><span>{items.length}</span>
            </h2>
            {items.length === 0 ? (
              <p className="rounded-b-xl border-2 border-t-0 border-neutral-300 p-3 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">None</p>
            ) : (
              <ul className="divide-y-2 divide-neutral-200 rounded-b-xl border-2 border-t-0 border-neutral-300 dark:divide-neutral-800 dark:border-neutral-700">
                {items.map((item) => (
                  <li key={item.visit.id} className={`border-l-8 ${s.bar}`}>
                    <button type="button" onClick={() => go(`/cow/${item.cow.id}`)} className="block w-full p-3 text-left">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl font-extrabold">{item.cow.number}{item.cow.isDemo && <DemoBadge />}</span>
                        <span className="text-right font-bold">
                          {formatDate(item.visit.nextCheckDate!)}
                          <span className="block text-sm font-semibold">{relativeDue(item.visit.nextCheckDate!, today)}</span>
                        </span>
                      </div>
                      <ul className="mt-1 text-base">
                        {item.visit.feet.map((f) => <li key={f.foot}>{footLine(f, opts)}</li>)}
                      </ul>
                    </button>
                    <div className="px-3 pb-3">
                      <Button className="w-full" onClick={() => setChecking(item)}>✓ Mark checked</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {later > 0 && <p className="mt-4 text-neutral-600 dark:text-neutral-300">{later} more recheck(s) planned later.</p>}
      {checking && <MarkCheckedDialog item={checking} onClose={() => setChecking(null)} />}
    </div>
  );
}
