import { useApp } from '../AppContext';
import { repo } from '../data';
import { useCow, useCowVisits, useOptionMap } from '../data/hooks';
import { repeatFindings } from '../lib/flags';
import { footLabel, footLine, treatmentsText } from '../lib/format';
import { useL } from '../lib/i18n';
import { go } from '../lib/router';
import { Button, DemoBadge } from '../components/ui';

export function CowHistory({ cowId }: { cowId: string }) {
  const { farm, toast } = useApp();
  const l = useL();
  const cow = useCow(farm.id, cowId);
  const visits = useCowVisits(farm.id, cowId);
  const opts = useOptionMap();

  if (cow === undefined || !visits) return <p>{l.t('app.loading')}</p>;
  if (cow === null) return <p className="text-xl font-bold">{l.t('trim.notOnFarm', { farm: farm.name })}</p>;

  const repeats = repeatFindings(visits, (id) => !!opts.get(id)?.isRoutine);

  const deleteVisit = async (visitId: string, date: string) => {
    if (!confirm(l.t('cow.confirmVisit', { date: l.date(date), cow: cow.number }))) return;
    try {
      const snap = await repo.deleteVisit(farm.id, visitId);
      toast({ message: l.t('cow.visitDeleted', { date: l.date(date) }), actionLabel: l.t('common.undo'), onAction: () => repo.restore(snap) });
    } catch (e) { alert(l.err(e)); }
  };

  const deleteCow = async () => {
    const n = visits.length;
    const q = n
      ? l.t('cow.confirmCow', { cow: cow.number, n, farm: farm.name })
      : l.t('cow.confirmCowNoVisits', { cow: cow.number, farm: farm.name });
    if (!confirm(q)) return;
    try {
      const snap = await repo.deleteCow(farm.id, cow.id);
      go('/cows');
      toast({ message: l.t('cow.cowDeleted', { cow: cow.number }), actionLabel: l.t('common.undo'), onAction: () => repo.restore(snap) });
    } catch (e) { alert(l.err(e)); }
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold">{l.t('trim.cow', { cow: cow.number })}{cow.isDemo && <DemoBadge />}</h1>

      {repeats.length > 0 && (
        <div className="mt-3 rounded-xl border-4 border-red-700 bg-red-50 p-3 text-red-900 dark:bg-red-950 dark:text-red-100">
          <p className="text-lg font-extrabold">{l.t('cow.repeatTitle')}</p>
          <ul className="mt-1 list-disc pl-6 font-semibold">
            {repeats.map((r) => (
              <li key={r.foot + r.problemId}>{footLabel(r.foot, l)} — {l.opt(opts.get(r.problemId), r.problemId)} ({r.count}×)</li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="primary" className="mt-3 w-full text-xl" onClick={() => go(`/trim/${cow.id}`)}>{l.t('cow.record')}</Button>

      <h2 className="mt-6 mb-2 text-sm font-bold tracking-wide uppercase">{l.t('cow.visits', { n: visits.length })}</h2>
      {visits.length === 0 && <p className="text-neutral-600 dark:text-neutral-300">{l.t('cow.noVisits')}</p>}
      <ol className="relative space-y-3 border-l-4 border-neutral-300 pl-4 dark:border-neutral-700">
        {visits.map((v) => (
          <li key={v.id} className="rounded-xl border-2 border-neutral-300 p-3 dark:border-neutral-700">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-extrabold">{l.date(v.date)}</span>
              <span className="rounded bg-neutral-200 px-2 text-sm font-bold dark:bg-neutral-800">
                {v.kind === 'trim' ? l.t('cow.kindTrim') : l.t('cow.kindCheck')}{v.isDemo && ' · DEMO'}
              </span>
            </div>
            {v.kind === 'check' && <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{l.t('cow.followUp')}</p>}
            <ul className="mt-1">{v.feet.map((f) => <li key={f.foot}>{footLine(f, opts, l)}</li>)}</ul>
            {v.treatmentIds.length > 0 && <p className="mt-1"><b>{l.t('cow.treatment')}</b> {treatmentsText(v.treatmentIds, v.treatmentOther, opts, l)}</p>}
            {v.notes && <p className="mt-1"><b>{l.t('cow.notes')}</b> {v.notes}</p>}
            <p className="mt-1 font-semibold">
              {v.nextCheckDate
                ? v.checkedOn
                  ? l.t('cow.recheckChecked', { due: l.date(v.nextCheckDate), on: l.date(v.checkedOn) })
                  : l.t('cow.recheckDue', { due: l.date(v.nextCheckDate) })
                : l.t('cow.noRecheck')}
            </p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => deleteVisit(v.id, v.date)}
                className="min-h-12 rounded-xl border-2 border-red-700 px-4 font-semibold text-red-700 dark:border-red-400 dark:text-red-400"
              >
                {l.t('cow.deleteVisit')}
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 border-t-2 border-neutral-300 pt-4 dark:border-neutral-700">
        <Button variant="danger" className="w-full" onClick={deleteCow}>{l.t('cow.deleteCow', { cow: cow.number })}</Button>
      </div>
    </div>
  );
}
