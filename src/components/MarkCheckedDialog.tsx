import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo, type DueItem } from '../data';
import { formatDate, todayISO, type Recheck } from '../lib/dates';
import { RecheckPicker } from './RecheckPicker';
import { Button } from './ui';

export function MarkCheckedDialog({ item, onClose }: { item: DueItem; onClose: () => void }) {
  const { farm, toast } = useApp();
  const today = todayISO();
  const [recheck, setRecheck] = useState<Recheck | null>(null);

  const confirm = async () => {
    if (!recheck) return;
    try {
      const follow = await repo.markChecked(farm.id, item.visit.id, today, recheck);
      toast({ message: `✓ Cow ${item.cow.number} checked. ${follow?.nextCheckDate ? `Next check ${formatDate(follow.nextCheckDate)}` : 'No further recheck'}` });
      onClose();
    } catch (e) {
      alert((e as Error).message);
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
        <h2 className="text-2xl font-extrabold">Mark cow {item.cow.number} checked</h2>
        <p className="mt-1 text-neutral-700 dark:text-neutral-300">Checked today ({formatDate(today)}). New recheck?</p>
        <div className="mt-3">
          <RecheckPicker value={recheck} onChange={setRecheck} baseDate={today} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!recheck} onClick={confirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
