import type { OptionItem } from './types';

const problems: [string, string, Partial<OptionItem>?][] = [
  ['p-routine', 'Routine trim / no problem', { isRoutine: true }],
  ['p-sole-ulcer', 'Sole ulcer'],
  ['p-sole-haem', 'Sole haemorrhage'],
  ['p-wld', 'White line disease'],
  ['p-dd', 'Digital dermatitis'],
  ['p-corn', 'Interdigital hyperplasia (corn)'],
  ['p-foot-rot', 'Foot rot'],
  ['p-heel-erosion', 'Heel erosion'],
  ['p-toe-ulcer', 'Toe ulcer'],
  ['p-double-sole', 'Double sole'],
  ['p-thin-sole', 'Thin sole'],
  ['p-other', 'Other', { isOther: true }],
];

const treatments: [string, string, Partial<OptionItem>?][] = [
  ['t-block', 'Block applied'],
  ['t-bandage', 'Bandage'],
  ['t-spray', 'Spray'],
  ['t-vet', 'Referred to vet'],
  ['t-other', 'Other', { isOther: true }],
];

export function defaultOptions(): OptionItem[] {
  return [
    ...problems.map(([id, label, extra], i) => ({ id, label, kind: 'problem' as const, hidden: false, order: i, ...extra })),
    ...treatments.map(([id, label, extra], i) => ({ id, label, kind: 'treatment' as const, hidden: false, order: i, ...extra })),
  ];
}
