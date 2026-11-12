import { useState } from 'react';
import { useApp } from '../AppContext';
import { repo, type OptionItem, type OptionKind } from '../data';
import { useOptions } from '../data/hooks';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';
import { todayISO } from '../lib/dates';
import { Button, Choice, Section, inputClass } from '../components/ui';

function OptionRow({ o }: { o: OptionItem }) {
  const [label, setLabel] = useState(o.label);
  const save = async () => {
    if (label.trim() && label.trim() !== o.label) await repo.updateOption(o.id, { label: label.trim() });
    else setLabel(o.label);
  };
  return (
    <li className="flex gap-2">
      <input
        className={`${inputClass} ${o.hidden ? 'line-through opacity-50' : ''}`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={`Rename ${o.label}`}
      />
      <Button className="w-24 shrink-0" onClick={() => repo.updateOption(o.id, { hidden: !o.hidden })}>
        {o.hidden ? 'Show' : 'Hide'}
      </Button>
    </li>
  );
}

function OptionEditor({ kind, items }: { kind: OptionKind; items: OptionItem[] }) {
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const add = async () => {
    try { await repo.addOption(kind, label); setLabel(''); setError(''); }
    catch (e) { setError((e as Error).message); }
  };
  return (
    <div>
      <ul className="space-y-2">{items.map((o) => <OptionRow key={o.id} o={o} />)}</ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className={inputClass} placeholder={`New ${kind}`} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button type="submit" variant="primary" className="w-24 shrink-0" disabled={!label.trim()}>Add</Button>
      </form>
      {error && <p className="mt-2 font-semibold text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Settings() {
  const { farm, toast } = useApp();
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
      if (!confirm('Replace ALL data on this phone with this backup? This cannot be undone.')) return;
      await repo.importAll(data);
      toast({ message: '✓ Backup imported' });
    } catch (e) {
      alert(`Import failed: ${(e as Error).message}`);
    }
  };

  const loadDemo = async () => {
    const n = await repo.loadDemo(farm.id);
    toast({ message: n ? `✓ Added ${n} DEMO cows to ${farm.name}` : 'Demo data is already loaded on this farm' });
  };

  const removeDemo = async () => {
    if (!confirm('Remove all DEMO cows and visits from every farm?')) return;
    await repo.removeDemo();
    toast({ message: 'Demo data removed' });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <Section title="Display">
        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as ThemePref[]).map((t) => (
            <Choice key={t} selected={theme === t} className="text-center capitalize" onClick={() => { setTheme(t); setThemePref(t); }}>
              {t === 'system' ? 'Auto' : t}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Problem list" hint="rename, hide or add">
        {options && <OptionEditor kind="problem" items={options.filter((o) => o.kind === 'problem')} />}
      </Section>

      <Section title="Treatment list" hint="rename, hide or add">
        {options && <OptionEditor kind="treatment" items={options.filter((o) => o.kind === 'treatment')} />}
      </Section>

      <Section title="Backup">
        <div className="grid gap-2">
          <Button onClick={exportData}>⬇ Export all data (JSON)</Button>
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-neutral-950 text-lg font-semibold dark:border-white">
            ⬆ Import backup
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importData(f); }} />
          </label>
        </div>
      </Section>

      <Section title="Demo data">
        <p className="mb-2 text-neutral-600 dark:text-neutral-300">Adds 15 sample cows (DEMO-001 … DEMO-015) with sample visits to <b>{farm.name}</b>. All are labelled DEMO.</p>
        <div className="grid gap-2">
          <Button onClick={loadDemo}>Load demo data</Button>
          <Button variant="danger" onClick={removeDemo}>Remove all demo data</Button>
        </div>
      </Section>

      <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
        HoofTrack demo · data is stored only on this device. HoofTrack only records what you select; it does not diagnose or suggest treatments.
      </p>
    </div>
  );
}
