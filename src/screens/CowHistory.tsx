import { useApp } from '../AppContext';
import { useCow, useCowVisits, useOptionMap } from '../data/hooks';
import { formatDate } from '../lib/dates';
import { repeatFindings } from '../lib/flags';
import { footLabel, footLine, treatmentsText } from '../lib/format';
import { go } from '../lib/router';
import { Button, DemoBadge } from '../components/ui';

export function CowHistory({ cowId }: { cowId: string }) {
  const { farm } = useApp();
  const cow = useCow(farm.id, cowId);
  const visits = useCowVisits(farm.id, cowId);
  const opts = useOptionMap();

  if (cow === undefined || !visits) return <p>Loading…</p>;
  if (cow === null) return <p className="text-xl font-bold">This cow is not on {farm.name}.</p>;

  const repeats = repeatFindings(visits, (id) => !!opts.get(id)?.isRoutine);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Cow {cow.number}{cow.isDemo && <DemoBadge />}</h1>

      {repeats.length > 0 && (
        <div className="mt-3 rounded-xl border-4 border-red-700 bg-red-50 p-3 text-red-900 dark:bg-red-950 dark:text-red-100">
          <p className="text-lg font-extrabold">⚑ Same problem recorded more than once on the same foot</p>
          <ul className="mt-1 list-disc pl-6 font-semibold">
            {repeats.map((r) => (
              <li key={r.foot + r.problemId}>{footLabel(r.foot)} — {opts.get(r.problemId)?.label ?? r.problemId} ({r.count}×)</li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="primary" className="mt-3 w-full text-xl" onClick={() => go(`/trim/${cow.id}`)}>+ Record trim</Button>

      <h2 className="mt-6 mb-2 text-sm font-bold tracking-wide uppercase">Visits ({visits.length})</h2>
      {visits.length === 0 && <p className="text-neutral-600 dark:text-neutral-300">No visits recorded yet.</p>}
      <ol className="relative space-y-3 border-l-4 border-neutral-300 pl-4 dark:border-neutral-700">
        {visits.map((v) => (
          <li key={v.id} className="rounded-xl border-2 border-neutral-300 p-3 dark:border-neutral-700">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-extrabold">{formatDate(v.date)}</span>
              <span className="rounded bg-neutral-200 px-2 text-sm font-bold dark:bg-neutral-800">
                {v.kind === 'trim' ? 'Trim' : 'Recheck'}{v.isDemo && ' · DEMO'}
              </span>
            </div>
            {v.kind === 'check' && <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Follow-up of earlier record:</p>}
            <ul className="mt-1">{v.feet.map((f) => <li key={f.foot}>{footLine(f, opts)}</li>)}</ul>
            {v.treatmentIds.length > 0 && <p className="mt-1"><b>Treatment:</b> {treatmentsText(v.treatmentIds, v.treatmentOther, opts)}</p>}
            {v.notes && <p className="mt-1"><b>Notes:</b> {v.notes}</p>}
            <p className="mt-1 font-semibold">
              {v.nextCheckDate
                ? v.checkedOn
                  ? `Recheck ${formatDate(v.nextCheckDate)} — checked ${formatDate(v.checkedOn)}`
                  : `Recheck due ${formatDate(v.nextCheckDate)}`
                : 'No recheck'}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
