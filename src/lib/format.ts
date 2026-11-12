import { CLAWS, FEET, SEVERITIES, type FootRecord, type OptionItem } from '../data/types';

export const footLabel = (id: string) => FEET.find((f) => f.id === id)?.label ?? id;
export const clawLabel = (id: string) => CLAWS.find((c) => c.id === id)?.label ?? id;
export const severityLabel = (id?: string) => SEVERITIES.find((s) => s.id === id)?.label;

export function problemsText(f: FootRecord, opts: Map<string, OptionItem>): string {
  return f.problemIds
    .map((id) => {
      const o = opts.get(id);
      const label = o?.label ?? id;
      return o?.isOther && f.otherText ? `${label}: ${f.otherText}` : label;
    })
    .join(', ');
}

export function footLine(f: FootRecord, opts: Map<string, OptionItem>): string {
  const sev = severityLabel(f.severity);
  return `${footLabel(f.foot)} · ${clawLabel(f.claw)} — ${problemsText(f, opts)}${sev ? ` (${sev})` : ''}`;
}

export function treatmentsText(ids: string[], other: string | undefined, opts: Map<string, OptionItem>): string {
  return ids
    .map((id) => {
      const o = opts.get(id);
      return o?.isOther && other ? `${o.label}: ${other}` : (o?.label ?? id);
    })
    .join(', ');
}
