import { useState } from 'react';
import { useApp } from '../AppContext';
import { FEET, CLAWS, SEVERITIES, repo, type Claw, type FootId, type FootRecord, type Severity } from '../data';
import { useCow, useOptions } from '../data/hooks';
import { todayISO, type Recheck } from '../lib/dates';
import { useL } from '../lib/i18n';
import { go } from '../lib/router';
import { RecheckPicker } from '../components/RecheckPicker';
import { Button, Choice, DemoBadge, Section, inputClass } from '../components/ui';

interface FootDraft {
  claw?: Claw;
  problemIds: string[];
  otherText: string;
  severity?: Severity;
}

export function TrimRecord({ cowId }: { cowId: string }) {
  const { farm, toast } = useApp();
  const l = useL();
  const cow = useCow(farm.id, cowId);
  const options = useOptions();
  const today = todayISO();

  const [date, setDate] = useState(today);
  const [feet, setFeet] = useState<Partial<Record<FootId, FootDraft>>>({});
  const [treatments, setTreatments] = useState<string[]>([]);
  const [treatmentOther, setTreatmentOther] = useState('');
  const [notes, setNotes] = useState('');
  const [recheck, setRecheck] = useState<Recheck | null>(null);
  const [saving, setSaving] = useState(false);

  if (cow === undefined || !options) return <p>{l.t('app.loading')}</p>;
  if (cow === null) return <p className="text-xl font-bold">{l.t('trim.notOnFarm', { farm: farm.name })}</p>;

  const problems = options.filter((o) => o.kind === 'problem');
  const treatmentOpts = options.filter((o) => o.kind === 'treatment');
  const byId = new Map(options.map((o) => [o.id, o]));
  const selectedFeet = FEET.filter((f) => feet[f.id]);
  const footName = (id: FootId) => l.t(`foot.${id}`);

  const toggleFoot = (id: FootId) =>
    setFeet((cur) => {
      const next = { ...cur };
      if (next[id]) delete next[id];
      else next[id] = { problemIds: [], otherText: '' };
      return next;
    });
  const patchFoot = (id: FootId, patch: Partial<FootDraft>) => setFeet((cur) => ({ ...cur, [id]: { ...cur[id]!, ...patch } }));
  const toggleProblem = (id: FootId, pid: string) => {
    const d = feet[id]!;
    const isRoutine = byId.get(pid)?.isRoutine;
    let list: string[];
    if (d.problemIds.includes(pid)) list = d.problemIds.filter((p) => p !== pid);
    // "Routine / no problem" and actual problems are mutually exclusive.
    else if (isRoutine) list = [pid];
    else list = [...d.problemIds.filter((p) => !byId.get(p)?.isRoutine), pid];
    patchFoot(id, { problemIds: list });
  };

  // Validation: tell him exactly what is still missing.
  const missing: string[] = [];
  if (selectedFeet.length === 0) missing.push(l.t('trim.mSelectFoot'));
  for (const f of selectedFeet) {
    const d = feet[f.id]!;
    if (!d.claw) missing.push(l.t('trim.mClaw', { foot: footName(f.id) }));
    if (d.problemIds.length === 0) missing.push(l.t('trim.mProblem', { foot: footName(f.id) }));
    if (d.problemIds.some((p) => byId.get(p)?.isOther) && !d.otherText.trim()) missing.push(l.t('trim.mOther', { foot: footName(f.id) }));
  }
  if (treatments.some((t) => byId.get(t)?.isOther) && !treatmentOther.trim()) missing.push(l.t('trim.mOtherTreat'));
  if (!recheck) missing.push(l.t('trim.mRecheck'));
  if (!date || date > today) missing.push(l.t('trim.mDate'));

  const save = async () => {
    if (missing.length || !recheck || saving) return;
    setSaving(true);
    try {
      const feetRecords: FootRecord[] = selectedFeet.map((f) => {
        const d = feet[f.id]!;
        const hasOther = d.problemIds.some((p) => byId.get(p)?.isOther);
        return { foot: f.id, claw: d.claw!, problemIds: d.problemIds, severity: d.severity, otherText: hasOther ? d.otherText.trim() : undefined };
      });
      const visit = await repo.addVisit({
        farmId: farm.id,
        cowId: cow.id,
        date,
        feet: feetRecords,
        treatmentIds: treatments,
        treatmentOther: treatments.some((t) => byId.get(t)?.isOther) ? treatmentOther.trim() : undefined,
        notes,
        recheck,
      });
      const next = visit.nextCheckDate ? l.t('check.next', { date: l.date(visit.nextCheckDate) }) : l.t('recheck.none');
      toast({
        message: l.t('trim.saved', { cow: cow.number, next }),
        actionLabel: l.t('common.undo'),
        onAction: async () => {
          await repo.deleteVisit(farm.id, visit.id);
          toast({ message: l.t('trim.undone', { cow: cow.number }) });
        },
      });
      go('/cows');
    } catch (e) {
      alert(l.err(e));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold">{l.t('trim.cow', { cow: cow.number })}{cow.isDemo && <DemoBadge />}</h1>
        <button type="button" onClick={() => history.back()} className="min-h-12 rounded-xl border-2 border-neutral-400 px-3 font-semibold dark:border-neutral-600">{l.t('common.cancel')}</button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="vdate" className="font-semibold">{l.t('trim.date')}</label>
        <input id="vdate" type="date" max={today} className={`${inputClass} flex-1`} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <Section title={l.t('trim.feet')} hint={l.t('trim.feetHint')}>
        <div className="grid grid-cols-2 gap-2">
          {FEET.map((f) => (
            <Choice key={f.id} selected={!!feet[f.id]} onClick={() => toggleFoot(f.id)} className="min-h-20 text-xl">
              {footName(f.id)}
            </Choice>
          ))}
        </div>
      </Section>

      {selectedFeet.map((f) => {
        const d = feet[f.id]!;
        return (
          <section key={f.id} className="mt-5 rounded-2xl border-4 border-neutral-950 p-3 dark:border-white">
            <h2 className="text-2xl font-extrabold">{footName(f.id)}</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CLAWS.map((c) => (
                <Choice key={c.id} selected={d.claw === c.id} onClick={() => patchFoot(f.id, { claw: c.id })} className="px-1 text-center text-base">
                  {l.t(`claw.${c.id}`)}
                </Choice>
              ))}
            </div>
            <h3 className="mt-4 mb-2 text-sm font-bold tracking-wide uppercase">{l.t('trim.problem')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {problems.filter((p) => !p.hidden || d.problemIds.includes(p.id)).map((p) => (
                <Choice key={p.id} selected={d.problemIds.includes(p.id)} onClick={() => toggleProblem(f.id, p.id)} className={p.isRoutine ? 'col-span-2' : ''}>
                  {l.opt(p, p.id)}
                </Choice>
              ))}
            </div>
            {d.problemIds.some((p) => byId.get(p)?.isOther) && (
              <input className={`${inputClass} mt-2`} placeholder={l.t('trim.otherProblem')} value={d.otherText} onChange={(e) => patchFoot(f.id, { otherText: e.target.value })} />
            )}
            <h3 className="mt-4 mb-2 text-sm font-bold tracking-wide uppercase">{l.t('trim.severity')} <span className="font-normal normal-case">({l.t('common.optional')})</span></h3>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITIES.map((s) => (
                <Choice key={s.id} selected={d.severity === s.id} onClick={() => patchFoot(f.id, { severity: d.severity === s.id ? undefined : s.id })} className="text-center">
                  {l.t(`sev.${s.id}`)}
                </Choice>
              ))}
            </div>
          </section>
        );
      })}

      <Section title={l.t('trim.treatment')} hint={l.t('common.optional')}>
        <div className="grid grid-cols-2 gap-2">
          {treatmentOpts.filter((t) => !t.hidden || treatments.includes(t.id)).map((t) => (
            <Choice
              key={t.id}
              selected={treatments.includes(t.id)}
              onClick={() => setTreatments((cur) => (cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]))}
            >
              {l.opt(t, t.id)}
            </Choice>
          ))}
        </div>
        {treatments.some((t) => byId.get(t)?.isOther) && (
          <input className={`${inputClass} mt-2`} placeholder={l.t('trim.otherTreatment')} value={treatmentOther} onChange={(e) => setTreatmentOther(e.target.value)} />
        )}
      </Section>

      <Section title={l.t('trim.notes')} hint={l.t('common.optional')}>
        <textarea className={`${inputClass} min-h-24 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Section>

      <Section title={l.t('trim.recheck')} hint={l.t('common.required')}>
        <RecheckPicker value={recheck} onChange={setRecheck} baseDate={date || today} />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-neutral-300 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-700 dark:bg-neutral-950">
        <div className="mx-auto max-w-xl">
          {missing.length > 0 && <p className="mb-2 truncate text-base font-semibold text-neutral-700 dark:text-neutral-300">{l.t('trim.stillNeeded', { list: missing.join(' · ') })}</p>}
          <Button variant="primary" className="min-h-16 w-full text-2xl" disabled={missing.length > 0 || saving} onClick={save}>
            {l.t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
