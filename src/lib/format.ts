import type { FootRecord, OptionItem } from '../data/types';
import type { L } from './i18n';

export const footLabel = (id: FootRecord['foot'], l: L) => l.t(`foot.${id}`);

export function problemsText(f: FootRecord, opts: Map<string, OptionItem>, l: L): string {
  return f.problemIds
    .map((id) => {
      const o = opts.get(id);
      const label = l.opt(o, id);
      return o?.isOther && f.otherText ? `${label}: ${f.otherText}` : label;
    })
    .join(', ');
}

export function footLine(f: FootRecord, opts: Map<string, OptionItem>, l: L): string {
  const sev = f.severity ? ` (${l.t(`sev.${f.severity}`)})` : '';
  return `${l.t(`foot.${f.foot}`)} · ${l.t(`claw.${f.claw}`)} — ${problemsText(f, opts, l)}${sev}`;
}

export function treatmentsText(ids: string[], other: string | undefined, opts: Map<string, OptionItem>, l: L): string {
  return ids
    .map((id) => {
      const o = opts.get(id);
      const label = l.opt(o, id);
      return o?.isOther && other ? `${label}: ${other}` : label;
    })
    .join(', ');
}
