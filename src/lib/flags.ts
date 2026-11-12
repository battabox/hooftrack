import type { FootId, Visit } from '../data/types';

export interface RepeatFinding {
  foot: FootId;
  problemId: string;
  count: number;
}

/**
 * Same foot + same recorded problem on 2 or more trim visits.
 * Only counts what the trimmer recorded; "routine / no problem" is ignored.
 * Follow-up "check" visits are not counted (they repeat the original record).
 */
export function repeatFindings(visits: Visit[], isRoutine: (problemId: string) => boolean): RepeatFinding[] {
  const counts = new Map<string, RepeatFinding>();
  for (const v of visits) {
    if (v.kind !== 'trim') continue;
    const seen = new Set<string>();
    for (const f of v.feet) {
      for (const p of f.problemIds) {
        if (isRoutine(p)) continue;
        const key = `${f.foot}|${p}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const cur = counts.get(key) ?? { foot: f.foot, problemId: p, count: 0 };
        cur.count++;
        counts.set(key, cur);
      }
    }
  }
  return [...counts.values()].filter((r) => r.count >= 2);
}
