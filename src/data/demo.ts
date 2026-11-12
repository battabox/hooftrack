import { addDays, startOfWeek, type Recheck } from '../lib/dates';
import type { FootRecord } from './types';

export interface DemoVisitSpec {
  date: string;
  feet: FootRecord[];
  treatmentIds: string[];
  recheck: Recheck;
  checkedOn?: string;
}
export interface DemoCowSpec {
  number: string;
  visits: DemoVisitSpec[];
}

const routine = (foot: FootRecord['foot']): FootRecord => ({ foot, claw: 'both', problemIds: ['p-routine'] });

/** ~15 obviously fake cows with visits placed relative to today so the dashboard has content. */
export function buildDemoData(today: string): DemoCowSpec[] {
  const nextWeekStart = addDays(startOfWeek(today), 7);
  const endThisWeek = addDays(startOfWeek(today), 6);
  const dueIn = (due: string, weeks: number, feet: FootRecord[], treatmentIds: string[]): DemoVisitSpec => ({
    date: addDays(due, -7 * weeks),
    feet,
    treatmentIds,
    recheck: { kind: 'weeks', weeks },
  });

  return [
    {
      number: 'DEMO-001',
      visits: [
        { date: addDays(today, -70), feet: [{ foot: 'LR', claw: 'outer', problemIds: ['p-sole-ulcer'], severity: 'mild' }], treatmentIds: ['t-block'], recheck: { kind: 'weeks', weeks: 3 }, checkedOn: addDays(today, -49) },
        dueIn(addDays(today, -7), 2, [{ foot: 'LR', claw: 'outer', problemIds: ['p-sole-ulcer'], severity: 'moderate' }], ['t-block']),
      ],
    },
    { number: 'DEMO-002', visits: [dueIn(addDays(today, -2), 2, [{ foot: 'RF', claw: 'both', problemIds: ['p-dd'] }], ['t-spray'])] },
    { number: 'DEMO-003', visits: [dueIn(addDays(today, -1), 1, [{ foot: 'LF', claw: 'inner', problemIds: ['p-wld'], severity: 'mild' }], ['t-block'])] },
    { number: 'DEMO-004', visits: [dueIn(today, 1, [{ foot: 'RR', claw: 'outer', problemIds: ['p-sole-haem'] }, routine('LR')], [])] },
    { number: 'DEMO-005', visits: [dueIn(endThisWeek, 2, [{ foot: 'LR', claw: 'both', problemIds: ['p-dd'], severity: 'severe' }], ['t-spray', 't-bandage'])] },
    { number: 'DEMO-006', visits: [dueIn(today, 3, [{ foot: 'RF', claw: 'inner', problemIds: ['p-toe-ulcer'] }], ['t-vet'])] },
    { number: 'DEMO-007', visits: [dueIn(addDays(nextWeekStart, 1), 2, [{ foot: 'LR', claw: 'both', problemIds: ['p-heel-erosion'] }], ['t-spray'])] },
    {
      number: 'DEMO-008',
      visits: [
        { date: addDays(today, -90), feet: [{ foot: 'RR', claw: 'both', problemIds: ['p-corn'] }], treatmentIds: [], recheck: { kind: 'none' } },
        dueIn(addDays(nextWeekStart, 3), 2, [{ foot: 'RR', claw: 'both', problemIds: ['p-corn'], severity: 'moderate' }], ['t-vet']),
      ],
    },
    { number: 'DEMO-009', visits: [dueIn(addDays(nextWeekStart, 5), 3, [{ foot: 'LF', claw: 'both', problemIds: ['p-foot-rot'] }], ['t-vet', 't-bandage'])] },
    { number: 'DEMO-010', visits: [dueIn(addDays(today, 20), 3, [{ foot: 'RR', claw: 'outer', problemIds: ['p-thin-sole'] }], ['t-block'])] },
    { number: 'DEMO-011', visits: [{ date: addDays(today, -5), feet: [routine('LF'), routine('RF'), routine('LR'), routine('RR')], treatmentIds: [], recheck: { kind: 'none' } }] },
    { number: 'DEMO-012', visits: [{ date: addDays(today, -12), feet: [routine('LR'), routine('RR')], treatmentIds: [], recheck: { kind: 'none' } }] },
    {
      number: 'DEMO-013',
      visits: [{ date: addDays(today, -16), feet: [{ foot: 'LF', claw: 'outer', problemIds: ['p-double-sole'] }], treatmentIds: ['t-block'], recheck: { kind: 'weeks', weeks: 2 }, checkedOn: addDays(today, -2) }],
    },
    { number: 'DEMO-014', visits: [{ date: addDays(today, -30), feet: [routine('LR'), routine('RR')], treatmentIds: [], recheck: { kind: 'none' } }] },
    { number: 'DEMO-015', visits: [] },
  ];
}
