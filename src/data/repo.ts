// Data access layer. The UI talks only to this Repo (and hooks.ts), never to Dexie directly,
// so a cloud-backed implementation of the same interface can be swapped in later.
// Every read that returns farm data takes a farmId, so one farm's data never leaks into another.

import { HoofDB } from './db';
import { DEFAULT_FARM_NAME, defaultOptions } from './defaults';
import { buildDemoData } from './demo';
import { nextCheckDate, todayISO, type Recheck } from '../lib/dates';
import type { BackupFile, Cow, Farm, FootRecord, OptionItem, OptionKind, TrimListItem, TrimStatus, Visit } from './types';

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

/** Everything removed by a delete, so it can be put back with restore() (undo). */
export interface DeletedSnapshot {
  farms: Farm[];
  cows: Cow[];
  visits: Visit[];
  trimList: TrimListItem[];
}

export interface DueItem {
  visit: Visit;
  cow: Cow;
}

export interface TrimListEntry {
  item: TrimListItem;
  cow: Cow;
}

export interface AddToListResult {
  added: string[];
  alreadyOnList: string[];
  newCows: string[];
}

/** Split pasted text into cow numbers: one per line (commas/semicolons also work). Spaces stay, ear tags contain them. */
export function parseCowNumbers(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n\r,;]+/)) {
    const n = displayCowNumber(part);
    const key = cowNumberKey(n);
    if (key && !seen.has(key)) { seen.add(key); out.push(n); }
  }
  return out;
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
    async deleteVisit(farmId: string, visitId: string): Promise<DeletedSnapshot> {
      const v = await db.visits.get(visitId);
      if (!v || v.farmId !== farmId) throw new Error('Visit not found on this farm');
      await db.visits.delete(visitId);
      return { farms: [], cows: [], visits: [v], trimList: [] };
    },
    /** Deletes a cow, all of its visits and its "to trim" entries. */
    async deleteCow(farmId: string, cowId: string): Promise<DeletedSnapshot> {
      return db.transaction('rw', db.cows, db.visits, db.trimList, async () => {
        const cow = await db.cows.get(cowId);
        if (!cow || cow.farmId !== farmId) throw new Error('Cow not found on this farm');
        const visits = await db.visits.where('[farmId+cowId]').equals([farmId, cowId]).toArray();
        const trimList = await db.trimList.where('[farmId+cowId]').equals([farmId, cowId]).toArray();
        await db.visits.bulkDelete(visits.map((v) => v.id));
        await db.trimList.bulkDelete(trimList.map((t) => t.id));
        await db.cows.delete(cowId);
        return { farms: [], cows: [cow], visits, trimList };
      });
    },
    /** Deletes a farm with all its cows and visits. The last remaining farm cannot be deleted. */
    async deleteFarm(farmId: string): Promise<DeletedSnapshot> {
      return db.transaction('rw', [db.farms, db.cows, db.visits, db.trimList], async () => {
        const farm = await db.farms.get(farmId);
        if (!farm) throw new Error('Farm not found');
        if ((await db.farms.count()) <= 1) throw new Error('You need at least one farm. Add another farm first.');
        const cows = await db.cows.where('farmId').equals(farmId).toArray();
        const visits = await db.visits.where('farmId').equals(farmId).toArray();
        const trimList = await db.trimList.where('farmId').equals(farmId).toArray();
        await db.visits.bulkDelete(visits.map((v) => v.id));
        await db.trimList.bulkDelete(trimList.map((t) => t.id));
        await db.cows.bulkDelete(cows.map((c) => c.id));
        await db.farms.delete(farmId);
        return { farms: [farm], cows, visits, trimList };
      });
    },
    /** Undo a delete. */
    async restore(s: DeletedSnapshot): Promise<void> {
      await db.transaction('rw', [db.farms, db.cows, db.visits, db.trimList], async () => {
        await db.farms.bulkPut(s.farms);
        await db.cows.bulkPut(s.cows);
        await db.visits.bulkPut(s.visits);
        await db.trimList.bulkPut(s.trimList);
      });
    },

    // ---- "To trim" list (farm adds cows, trimmer ticks them off)
    async listTrimList(farmId: string): Promise<TrimListEntry[]> {
      const [items, cows] = await Promise.all([
        db.trimList.where('farmId').equals(farmId).toArray(),
        db.cows.where('farmId').equals(farmId).toArray(),
      ]);
      const byId = new Map(cows.map((c) => [c.id, c]));
      return items
        .filter((item) => byId.has(item.cowId))
        .map((item) => ({ item, cow: byId.get(item.cowId)! }))
        .sort((a, b) => a.item.createdAt.localeCompare(b.item.createdAt) || a.cow.number.localeCompare(b.cow.number, undefined, { numeric: true }));
    },
    /** Adds cows by number. Unknown numbers become new cows. A cow already open on the list is not added twice. */
    async addToTrimList(farmId: string, text: string): Promise<AddToListResult> {
      if (!(await db.farms.get(farmId))) throw new Error('Farm not found');
      const result: AddToListResult = { added: [], alreadyOnList: [], newCows: [] };
      const today = todayISO();
      for (const number of parseCowNumbers(text)) {
        let cow = await repo.findCowByNumber(farmId, number);
        if (!cow) { cow = await repo.addCow(farmId, number); result.newCows.push(cow.number); }
        const open = await db.trimList.where('[farmId+cowId]').equals([farmId, cow.id]).filter((t) => t.status === 'todo').first();
        if (open) { result.alreadyOnList.push(cow.number); continue; }
        await db.trimList.add({ id: newId(), farmId, cowId: cow.id, addedOn: today, status: 'todo', resolvedOn: null, createdAt: nowStamp() });
        result.added.push(cow.number);
      }
      return result;
    },
    async setTrimStatus(farmId: string, itemId: string, status: TrimStatus): Promise<void> {
      const item = await db.trimList.get(itemId);
      if (!item || item.farmId !== farmId) throw new Error('Not on this farm’s list');
      await db.trimList.update(itemId, { status, resolvedOn: status === 'todo' ? null : todayISO() });
    },
    async removeFromTrimList(farmId: string, itemId: string): Promise<void> {
      const item = await db.trimList.get(itemId);
      if (item && item.farmId === farmId) await db.trimList.delete(itemId);
    },
    /** Removes ticked-off entries (trimmed / not possible). Returns them for undo. */
    async clearFinishedTrimList(farmId: string): Promise<DeletedSnapshot> {
      const done = await db.trimList.where('farmId').equals(farmId).filter((t) => t.status !== 'todo').toArray();
      await db.trimList.bulkDelete(done.map((t) => t.id));
      return { farms: [], cows: [], visits: [], trimList: done };
    },
    async countFarmData(farmId: string): Promise<{ cows: number; visits: number }> {
      const [cows, visits] = await Promise.all([
        db.cows.where('farmId').equals(farmId).count(),
        db.visits.where('farmId').equals(farmId).count(),
      ]);
      return { cows, visits };
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
      const [farms, cows, visits, options, trimList] = await Promise.all([
        db.farms.toArray(), db.cows.toArray(), db.visits.toArray(), db.options.toArray(), db.trimList.toArray(),
      ]);
      return { app: 'HoofTrack', version: 1, exportedAt: nowStamp(), farms, cows, visits, options, trimList };
    },
    async importAll(data: unknown): Promise<void> {
      const d = data as BackupFile;
      if (!d || d.app !== 'HoofTrack' || !Array.isArray(d.farms) || !Array.isArray(d.cows) || !Array.isArray(d.visits) || !Array.isArray(d.options)) {
        throw new Error('This is not a HoofTrack backup file');
      }
      await db.transaction('rw', [db.farms, db.cows, db.visits, db.options, db.trimList], async () => {
        await Promise.all([db.farms.clear(), db.cows.clear(), db.visits.clear(), db.options.clear(), db.trimList.clear()]);
        await db.farms.bulkAdd(d.farms);
        await db.cows.bulkAdd(d.cows);
        await db.visits.bulkAdd(d.visits);
        await db.options.bulkAdd(d.options);
        if (Array.isArray(d.trimList)) await db.trimList.bulkAdd(d.trimList);
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
      await db.transaction('rw', db.cows, db.visits, db.trimList, async () => {
        const demoCowIds = new Set((await db.cows.filter((c) => c.isDemo).toArray()).map((c) => c.id));
        await db.trimList.filter((t) => demoCowIds.has(t.cowId)).delete();
        await db.visits.filter((v) => v.isDemo).delete();
        await db.cows.filter((c) => c.isDemo).delete();
      });
    },
  };
  return repo;
}

export type Repo = ReturnType<typeof createRepo>;
