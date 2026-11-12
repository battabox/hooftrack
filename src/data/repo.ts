// Data access layer. The UI talks only to this Repo (and hooks.ts), never to Dexie directly,
// so a cloud-backed implementation of the same interface can be swapped in later.
// Every read that returns farm data takes a farmId, so one farm's data never leaks into another.

import { HoofDB } from './db';
import { DEFAULT_FARM_NAME, defaultOptions } from './defaults';
import { buildDemoData } from './demo';
import { nextCheckDate, todayISO, type Recheck } from '../lib/dates';
import type { BackupFile, Cow, Farm, FootRecord, OptionItem, OptionKind, Visit } from './types';

export class DuplicateCowError extends Error {
  constructor(public existing: Cow) {
    super(`Cow ${existing.number} already exists on this farm`);
    this.name = 'DuplicateCowError';
  }
}

/** Display form: trimmed, single spaces. */
export function displayCowNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}
/** Key for duplicate detection: case, spaces, dashes and dots are ignored ("nl 12-34" == "NL1234"). */
export function cowNumberKey(raw: string): string {
  return raw.toUpperCase().replace(/[\s.\-]/g, '');
}

// crypto.randomUUID is unavailable on plain-http LAN pages, so use a simple id.
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
const nowStamp = () => new Date().toISOString();

export interface NewVisitInput {
  farmId: string;
  cowId: string;
  date: string;
  feet: FootRecord[];
  treatmentIds: string[];
  treatmentOther?: string;
  notes?: string;
  recheck: Recheck;
  isDemo?: boolean;
}

export interface DueItem {
  visit: Visit;
  cow: Cow;
}

export function createRepo(db: HoofDB) {
  const repo = {
    async ensureSeed(): Promise<void> {
      await db.transaction('rw', db.farms, db.options, async () => {
        if ((await db.farms.count()) === 0) {
          await db.farms.add({ id: newId(), name: DEFAULT_FARM_NAME, createdAt: nowStamp() });
        }
        if ((await db.options.count()) === 0) await db.options.bulkAdd(defaultOptions());
      });
    },

    // ---- Farms
    async listFarms(): Promise<Farm[]> {
      return (await db.farms.toArray()).sort((a, b) => a.name.localeCompare(b.name));
    },
    async addFarm(name: string): Promise<Farm> {
      const clean = name.trim();
      if (!clean) throw new Error('Enter a farm name');
      const all = await db.farms.toArray();
      if (all.some((f) => f.name.toLowerCase() === clean.toLowerCase())) throw new Error('A farm with this name already exists');
      const farm = { id: newId(), name: clean, createdAt: nowStamp() };
      await db.farms.add(farm);
      return farm;
    },

    // ---- Cows
    async getCow(farmId: string, cowId: string): Promise<Cow | undefined> {
      const cow = await db.cows.get(cowId);
      return cow && cow.farmId === farmId ? cow : undefined;
    },
    async searchCows(farmId: string, query: string): Promise<Cow[]> {
      const q = cowNumberKey(query);
      const cows = await db.cows.where('farmId').equals(farmId).toArray();
      const rank = (c: Cow) => (c.numberKey === q ? 0 : c.numberKey.startsWith(q) ? 1 : 2);
      return cows
        .filter((c) => !q || c.numberKey.includes(q))
        .sort((a, b) => rank(a) - rank(b) || a.number.localeCompare(b.number, undefined, { numeric: true }));
    },
    async findCowByNumber(farmId: string, raw: string): Promise<Cow | undefined> {
      return db.cows.where('[farmId+numberKey]').equals([farmId, cowNumberKey(raw)]).first();
    },
    async addCow(farmId: string, raw: string, isDemo = false): Promise<Cow> {
      const number = displayCowNumber(raw);
      const numberKey = cowNumberKey(raw);
      if (!numberKey) throw new Error('Enter a cow number');
      if (!(await db.farms.get(farmId))) throw new Error('Farm not found');
      return db.transaction('rw', db.cows, async () => {
        const existing = await db.cows.where('[farmId+numberKey]').equals([farmId, numberKey]).first();
        if (existing) throw new DuplicateCowError(existing);
        const cow: Cow = { id: newId(), farmId, number, numberKey, createdAt: nowStamp(), isDemo };
        await db.cows.add(cow);
        return cow;
      });
    },

    // ---- Visits
    async addVisit(input: NewVisitInput): Promise<Visit> {
      const cow = await db.cows.get(input.cowId);
      if (!cow || cow.farmId !== input.farmId) throw new Error('Cow does not belong to this farm');
      if (input.feet.length === 0) throw new Error('Select at least one foot');
      for (const f of input.feet) if (f.problemIds.length === 0) throw new Error('Each foot needs a problem');
      const visit: Visit = {
        id: newId(),
        farmId: input.farmId,
        cowId: input.cowId,
        kind: 'trim',
        date: input.date,
        feet: input.feet,
        treatmentIds: input.treatmentIds,
        treatmentOther: input.treatmentOther || undefined,
        notes: input.notes?.trim() || undefined,
        recheck: input.recheck,
        nextCheckDate: nextCheckDate(input.date, input.recheck),
        checkedOn: null,
        createdAt: nowStamp(),
        isDemo: input.isDemo ?? false,
      };
      await db.visits.add(visit);
      return visit;
    },
    async deleteVisit(farmId: string, visitId: string): Promise<void> {
      const v = await db.visits.get(visitId);
      if (v && v.farmId === farmId) await db.visits.delete(visitId);
    },
    async listCowVisits(farmId: string, cowId: string): Promise<Visit[]> {
      const visits = await db.visits.where('[farmId+cowId]').equals([farmId, cowId]).toArray();
      return visits.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    },
    /** Open rechecks (not yet marked checked) for one farm, soonest first. */
    async listDue(farmId: string): Promise<DueItem[]> {
      const [visits, cows] = await Promise.all([
        db.visits.where('farmId').equals(farmId).filter((v) => !!v.nextCheckDate && !v.checkedOn).toArray(),
        db.cows.where('farmId').equals(farmId).toArray(),
      ]);
      const byId = new Map(cows.map((c) => [c.id, c]));
      return visits
        .filter((v) => byId.has(v.cowId))
        .map((visit) => ({ visit, cow: byId.get(visit.cowId)! }))
        .sort((a, b) => a.visit.nextCheckDate!.localeCompare(b.visit.nextCheckDate!));
    },
    /** Close a recheck. If a new recheck is chosen, a follow-up "check" visit is created. */
    async markChecked(farmId: string, visitId: string, checkedOn: string, recheck: Recheck): Promise<Visit | null> {
      return db.transaction('rw', db.visits, async () => {
        const v = await db.visits.get(visitId);
        if (!v || v.farmId !== farmId) throw new Error('Visit not found on this farm');
        const next = nextCheckDate(checkedOn, recheck); // validate before writing
        await db.visits.update(visitId, { checkedOn });
        if (!next) return null;
        const follow: Visit = {
          id: newId(),
          farmId,
          cowId: v.cowId,
          kind: 'check',
          date: checkedOn,
          feet: v.feet,
          treatmentIds: [],
          recheck,
          nextCheckDate: next,
          checkedOn: null,
          followUpOf: v.id,
          createdAt: nowStamp(),
          isDemo: v.isDemo,
        };
        await db.visits.add(follow);
        return follow;
      });
    },

    // ---- Problem / treatment lists
    async listOptions(): Promise<OptionItem[]> {
      return (await db.options.toArray()).sort((a, b) => a.order - b.order);
    },
    async addOption(kind: OptionKind, label: string): Promise<void> {
      const clean = label.trim();
      if (!clean) throw new Error('Enter a name');
      const same = await db.options.where('kind').equals(kind).toArray();
      if (same.some((o) => o.label.toLowerCase() === clean.toLowerCase())) throw new Error('Already in the list');
      const order = Math.max(-1, ...same.map((o) => o.order)) + 1;
      await db.options.add({ id: newId(), kind, label: clean, hidden: false, order });
    },
    async updateOption(id: string, changes: Partial<Pick<OptionItem, 'label' | 'hidden'>>): Promise<void> {
      if (changes.label !== undefined && !changes.label.trim()) throw new Error('Name cannot be empty');
      await db.options.update(id, changes);
    },

    // ---- Backup
    async exportAll(): Promise<BackupFile> {
      const [farms, cows, visits, options] = await Promise.all([
        db.farms.toArray(), db.cows.toArray(), db.visits.toArray(), db.options.toArray(),
      ]);
      return { app: 'HoofTrack', version: 1, exportedAt: nowStamp(), farms, cows, visits, options };
    },
    async importAll(data: unknown): Promise<void> {
      const d = data as BackupFile;
      if (!d || d.app !== 'HoofTrack' || !Array.isArray(d.farms) || !Array.isArray(d.cows) || !Array.isArray(d.visits) || !Array.isArray(d.options)) {
        throw new Error('This is not a HoofTrack backup file');
      }
      await db.transaction('rw', [db.farms, db.cows, db.visits, db.options], async () => {
        await Promise.all([db.farms.clear(), db.cows.clear(), db.visits.clear(), db.options.clear()]);
        await db.farms.bulkAdd(d.farms);
        await db.cows.bulkAdd(d.cows);
        await db.visits.bulkAdd(d.visits);
        await db.options.bulkAdd(d.options);
      });
      await repo.ensureSeed();
    },

    // ---- Demo data
    async loadDemo(farmId: string): Promise<number> {
      const today = todayISO();
      let added = 0;
      for (const spec of buildDemoData(today)) {
        if (await repo.findCowByNumber(farmId, spec.number)) continue;
        const cow = await repo.addCow(farmId, spec.number, true);
        added++;
        for (const v of spec.visits) {
          const visit = await repo.addVisit({ ...v, farmId, cowId: cow.id, notes: 'DEMO record (sample data)', isDemo: true });
          if (v.checkedOn) await db.visits.update(visit.id, { checkedOn: v.checkedOn });
        }
      }
      return added;
    },
    async removeDemo(): Promise<void> {
      await db.transaction('rw', db.cows, db.visits, async () => {
        await db.visits.filter((v) => v.isDemo).delete();
        await db.cows.filter((c) => c.isDemo).delete();
      });
    },
  };
  return repo;
}

export type Repo = ReturnType<typeof createRepo>;
