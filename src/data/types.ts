import type { Recheck } from '../lib/dates';
export type { Recheck };

export type FootId = 'LF' | 'RF' | 'LR' | 'RR';
export type Claw = 'inner' | 'outer' | 'both';
export type Severity = 'mild' | 'moderate' | 'severe';
export type OptionKind = 'problem' | 'treatment';

export const FEET: { id: FootId; label: string }[] = [
  { id: 'LF', label: 'Left Front' },
  { id: 'RF', label: 'Right Front' },
  { id: 'LR', label: 'Left Rear' },
  { id: 'RR', label: 'Right Rear' },
];
export const CLAWS: { id: Claw; label: string }[] = [
  { id: 'inner', label: 'Inner claw' },
  { id: 'outer', label: 'Outer claw' },
  { id: 'both', label: 'Both' },
];
export const SEVERITIES: { id: Severity; label: string }[] = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
];

export interface Farm {
  id: string;
  name: string;
  createdAt: string;
}

export interface Cow {
  id: string;
  farmId: string;
  /** As typed (trimmed), shown to the user */
  number: string;
  /** Normalised key used for duplicate detection */
  numberKey: string;
  createdAt: string;
  isDemo: boolean;
}

export interface FootRecord {
  foot: FootId;
  claw: Claw;
  problemIds: string[];
  otherText?: string;
  severity?: Severity;
}

export interface Visit {
  id: string;
  farmId: string;
  cowId: string;
  /** 'trim' = recorded trim; 'check' = follow-up created by "Mark checked" */
  kind: 'trim' | 'check';
  date: string;
  feet: FootRecord[];
  treatmentIds: string[];
  treatmentOther?: string;
  notes?: string;
  recheck: Recheck;
  nextCheckDate: string | null;
  /** Date the recheck was done (closes it on the dashboard) */
  checkedOn: string | null;
  followUpOf?: string;
  createdAt: string;
  isDemo: boolean;
}

export interface OptionItem {
  id: string;
  kind: OptionKind;
  label: string;
  hidden: boolean;
  order: number;
  isOther?: boolean;
  isRoutine?: boolean;
}

export type TrimStatus = 'todo' | 'done' | 'notDone';

/** A cow the farm wants trimmed; the trimmer ticks it off. */
export interface TrimListItem {
  id: string;
  farmId: string;
  cowId: string;
  addedOn: string;
  status: TrimStatus;
  resolvedOn: string | null;
  createdAt: string;
}

export interface BackupFile {
  app: 'HoofTrack';
  version: 1;
  exportedAt: string;
  farms: Farm[];
  cows: Cow[];
  visits: Visit[];
  options: OptionItem[];
  /** Added later; older backups don't have it. */
  trimList?: TrimListItem[];
}
