import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo, type DueItem } from '../data';
import { todayISO, type Recheck } from '../lib/dates';
import { useL } from '../lib/i18n';
import { RecheckPicker } from './RecheckPicker';
import { Button } from './ui';

export function MarkCheckedDialog({ item, onClose }: { item: DueItem; onClose: () => void }) {
  const { farm, toast } = useApp();
  const l = useL();
  const today = todayISO();
  const [recheck, setRecheck] = useState<Recheck | null>(null);

  const confirm = async () => {
    if (!recheck) return;
    try {
      const follow = await repo.markChecked(farm.id, item.visit.id, today, recheck);
      const next = follow?.nextCheckDate ? l.t('check.next', { date: l.date(follow.nextCheckDate) }) : l.t('check.noMore');
      toast({ message: l.t('check.done', { cow: item.cow.number, next }) });
      onClose();
    } catch (e) {
      alert(l.err(e));
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold">{l.t('check.title', { cow: item.cow.number })}</h2>
        <p className="mt-1 text-neutral-700 dark:text-neutral-300">{l.t('check.sub', { date: l.date(today) })}</p>
        <div className="mt-3">
          <RecheckPicker value={recheck} onChange={setRecheck} baseDate={today} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onClose}>{l.t('common.cancel')}</Button>
          <Button variant="primary" disabled={!recheck} onClick={confirm}>{l.t('common.confirm')}</Button>
        </div>
      </div>
    </div>
  );
}
