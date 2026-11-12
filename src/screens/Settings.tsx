import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo, type OptionItem, type OptionKind } from '../data';
import { useOptions } from '../data/hooks';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';
import { todayISO } from '../lib/dates';
import { LANGUAGES, useL, type Key } from '../lib/i18n';
import { Button, Choice, Section, inputClass } from '../components/ui';

function OptionRow({ o }: { o: OptionItem }) {
  const l = useL();
  const shown = l.opt(o, o.id);
  const [label, setLabel] = useState(shown);
  const save = async () => {
    const clean = label.trim();
    if (clean && clean !== shown) await repo.updateOption(o.id, { label: clean });
    else setLabel(shown);
  };
  return (
    <li className="flex gap-2">
      <input
        className={`${inputClass} ${o.hidden ? 'line-through opacity-50' : ''}`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={l.t('set.rename', { name: shown })}
      />
      <Button className="w-24 shrink-0" onClick={() => repo.updateOption(o.id, { hidden: !o.hidden })}>
        {o.hidden ? l.t('set.show') : l.t('set.hide')}
      </Button>
    </li>
  );
}

function OptionEditor({ kind, items }: { kind: OptionKind; items: OptionItem[] }) {
  const l = useL();
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const add = async () => {
    try { await repo.addOption(kind, label); setLabel(''); setError(''); }
    catch (e) { setError(l.err(e)); }
  };
  return (
    <div>
      {/* key includes language so rows re-read their translated label after switching */}
      <ul className="space-y-2">{items.map((o) => <OptionRow key={`${o.id}-${l.lang}-${o.label}`} o={o} />)}</ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className={inputClass} placeholder={kind === 'problem' ? l.t('set.newProblem') : l.t('set.newTreatment')} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button type="submit" variant="primary" className="w-28 shrink-0" disabled={!label.trim()}>{l.t('common.add')}</Button>
      </form>
      {error && <p className="mt-2 font-semibold text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

const THEMES: { id: ThemePref; label: Key }[] = [
  { id: 'system', label: 'set.auto' },
  { id: 'light', label: 'set.light' },
  { id: 'dark', label: 'set.dark' },
];

export function Settings() {
  const { farm, toast } = useApp();
  const l = useL();
  const options = useOptions();
  const [theme, setTheme] = useState<ThemePref>(getThemePref);

  const exportData = async () => {
    const data = await repo.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hooftrack-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!confirm(l.t('set.confirmImport'))) return;
      await repo.importAll(data);
      toast({ message: l.t('set.imported') });
    } catch (e) {
      alert(l.t('set.importFailed', { msg: l.err(e) }));
    }
  };

  const loadDemo = async () => {
    const n = await repo.loadDemo(farm.id);
    toast({ message: n ? l.t('set.demoAdded', { n, farm: farm.name }) : l.t('set.demoAlready') });
  };

  const removeDemo = async () => {
    if (!confirm(l.t('set.confirmRemoveDemo'))) return;
    await repo.removeDemo();
    toast({ message: l.t('set.demoRemoved') });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{l.t('set.title')}</h1>

      <Section title={l.t('set.language')}>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lg) => (
            <Choice key={lg.id} selected={l.lang === lg.id} className="text-center" onClick={() => l.setLang(lg.id)}>
              {lg.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title={l.t('set.display')}>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <Choice key={t.id} selected={theme === t.id} className="text-center" onClick={() => { setTheme(t.id); setThemePref(t.id); }}>
              {l.t(t.label)}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title={l.t('set.problems')} hint={l.t('set.listHint')}>
        {options && <OptionEditor kind="problem" items={options.filter((o) => o.kind === 'problem')} />}
      </Section>

      <Section title={l.t('set.treatments')} hint={l.t('set.listHint')}>
        {options && <OptionEditor kind="treatment" items={options.filter((o) => o.kind === 'treatment')} />}
      </Section>

      <Section title={l.t('set.backup')}>
        <div className="grid gap-2">
          <Button onClick={exportData}>{l.t('set.export')}</Button>
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-neutral-950 text-lg font-semibold dark:border-white">
            {l.t('set.import')}
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importData(f); }} />
          </label>
        </div>
      </Section>

      <Section title={l.t('set.demo')}>
        <p className="mb-2 text-neutral-600 dark:text-neutral-300">{l.t('set.demoText', { farm: farm.name })}</p>
        <div className="grid gap-2">
          <Button onClick={loadDemo}>{l.t('set.loadDemo')}</Button>
          <Button variant="danger" onClick={removeDemo}>{l.t('set.removeDemo')}</Button>
        </div>
      </Section>

      <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">{l.t('set.footer')}</p>
    </div>
  );
}
