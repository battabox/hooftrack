import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { HoofDB, SCHEMA_V1 } from './db';
import { createRepo, DuplicateCowError, parseCowNumbers, type Repo } from './repo';
import { repeatFindings } from '../lib/flags';

let repo: Repo;
let farmA: string;
let farmB: string;

beforeEach(async () => {
  repo = createRepo(new HoofDB(`test-${Math.random()}`));
  await repo.ensureSeed();
  farmA = (await repo.listFarms())[0].id;
  farmB = (await repo.addFarm('Other Farm')).id;
});

describe('duplicate cow prevention', () => {
  it('pre-creates the default farm', async () => {
    expect((await repo.listFarms()).map((f) => f.name)).toContain('Middelweerd Mantgum');
  });

  it('renames an existing "Demo Farm" once, keeping its cows', async () => {
    const name = `migrate-${Math.random()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores(SCHEMA_V1);
    await v1.table('farms').add({ id: 'f1', name: 'Demo Farm', createdAt: '2026-11-01' });
    await v1.table('cows').add({ id: 'c1', farmId: 'f1', number: '12', numberKey: '12', createdAt: '2026-11-01', isDemo: false });
    v1.close();

    const migrated = createRepo(new HoofDB(name));
    expect((await migrated.listFarms()).map((f) => f.name)).toEqual(['Middelweerd Mantgum']);
    expect(await migrated.getCow('f1', 'c1')).toMatchObject({ number: '12' });
  });

  it('rejects the same cow number twice on one farm', async () => {
    await repo.addCow(farmA, '1234');
    await expect(repo.addCow(farmA, '1234')).rejects.toBeInstanceOf(DuplicateCowError);
  });

  it('treats case, spaces and dashes as the same number', async () => {
    await repo.addCow(farmA, 'NL 1234-56');
    await expect(repo.addCow(farmA, 'nl123456')).rejects.toBeInstanceOf(DuplicateCowError);
    await expect(repo.addCow(farmA, '  NL  1234 56 ')).rejects.toBeInstanceOf(DuplicateCowError);
  });

  it('allows the same number on a different farm', async () => {
    await repo.addCow(farmA, '1234');
    await expect(repo.addCow(farmB, '1234')).resolves.toMatchObject({ farmId: farmB });
  });

  it('rejects empty numbers', async () => {
    await expect(repo.addCow(farmA, '   ')).rejects.toThrow();
  });
});

describe('deleting records', () => {
  const visitFor = (farmId: string, cowId: string) => repo.addVisit({
    farmId, cowId, date: '2026-11-01',
    feet: [{ foot: 'LF', claw: 'outer', problemIds: ['p-sole-ulcer'] }], treatmentIds: [], recheck: { kind: 'weeks', weeks: 2 },
  });

  it('deletes one visit and can undo it', async () => {
    const cow = await repo.addCow(farmA, '10');
    const v = await visitFor(farmA, cow.id);
    const snap = await repo.deleteVisit(farmA, v.id);
    expect(await repo.listCowVisits(farmA, cow.id)).toHaveLength(0);
    await repo.restore(snap);
    expect(await repo.listCowVisits(farmA, cow.id)).toHaveLength(1);
  });

  it('deletes a cow with its visits, frees the number, and can undo', async () => {
    const cow = await repo.addCow(farmA, '20');
    await visitFor(farmA, cow.id);
    await visitFor(farmA, cow.id);
    const snap = await repo.deleteCow(farmA, cow.id);
    expect(await repo.getCow(farmA, cow.id)).toBeUndefined();
    expect(await repo.listDue(farmA)).toHaveLength(0);
    await repo.restore(snap);
    expect(await repo.listCowVisits(farmA, cow.id)).toHaveLength(2);
  });

  it('cannot delete from another farm', async () => {
    const cow = await repo.addCow(farmA, '30');
    await expect(repo.deleteCow(farmB, cow.id)).rejects.toThrow();
    expect(await repo.getCow(farmA, cow.id)).toBeDefined();
  });

  it('deletes a farm with all its data but leaves other farms alone', async () => {
    const a = await repo.addCow(farmA, '40');
    const b = await repo.addCow(farmB, '40');
    await visitFor(farmB, b.id);
    const snap = await repo.deleteFarm(farmB);
    expect((await repo.listFarms()).map((f) => f.id)).toEqual([farmA]);
    expect(await repo.getCow(farmA, a.id)).toBeDefined();
    await repo.restore(snap);
    expect(await repo.listDue(farmB)).toHaveLength(1);
  });

  it('refuses to delete the last farm', async () => {
    await repo.deleteFarm(farmB);
    await expect(repo.deleteFarm(farmA)).rejects.toThrow();
  });
});

describe('"To trim" list', () => {
  it('parses one number per line and keeps spaces inside ear tags', () => {
    expect(parseCowNumbers('12\n 34 \n\nNL 1234 5678\n12, 56; 78')).toEqual(['12', '34', 'NL 1234 5678', '56', '78']);
  });

  it('adds cows, creates unknown ones, and never lists a cow twice', async () => {
    await repo.addCow(farmA, '100');
    const r1 = await repo.addToTrimList(farmA, '100\n200');
    expect(r1).toEqual({ added: ['100', '200'], alreadyOnList: [], newCows: ['200'] });
    const r2 = await repo.addToTrimList(farmA, '200\n300');
    expect(r2.alreadyOnList).toEqual(['200']);
    expect((await repo.listTrimList(farmA)).map((e) => e.cow.number)).toEqual(['100', '200', '300']);
    expect(await repo.listTrimList(farmB)).toHaveLength(0);
  });

  it('ticks cows off, can undo, and clears finished', async () => {
    await repo.addToTrimList(farmA, '1\n2\n3');
    const [a, b] = await repo.listTrimList(farmA);
    await repo.setTrimStatus(farmA, a.item.id, 'done');
    await repo.setTrimStatus(farmA, b.item.id, 'notDone');
    await expect(repo.setTrimStatus(farmB, a.item.id, 'todo')).rejects.toThrow();
    const statuses = (await repo.listTrimList(farmA)).map((e) => e.item.status);
    expect(statuses).toEqual(['done', 'notDone', 'todo']);
    const snap = await repo.clearFinishedTrimList(farmA);
    expect(await repo.listTrimList(farmA)).toHaveLength(1);
    await repo.restore(snap);
    expect(await repo.listTrimList(farmA)).toHaveLength(3);
  });

  it('a cow that was trimmed can be put on the list again', async () => {
    await repo.addToTrimList(farmA, '9');
    const [e] = await repo.listTrimList(farmA);
    await repo.setTrimStatus(farmA, e.item.id, 'done');
    expect((await repo.addToTrimList(farmA, '9')).added).toEqual(['9']);
  });
});

describe('farm isolation and visits', () => {
  it('never returns another farm’s cows or rechecks', async () => {
    const cow = await repo.addCow(farmA, '77');
    await repo.addVisit({
      farmId: farmA, cowId: cow.id, date: '2026-11-12',
      feet: [{ foot: 'LF', claw: 'outer', problemIds: ['p-sole-ulcer'] }],
      treatmentIds: [], recheck: { kind: 'weeks', weeks: 2 },
    });
    expect(await repo.searchCows(farmB, '77')).toHaveLength(0);
    expect(await repo.getCow(farmB, cow.id)).toBeUndefined();
    expect(await repo.listDue(farmB)).toHaveLength(0);
    const due = await repo.listDue(farmA);
    expect(due).toHaveLength(1);
    expect(due[0].visit.nextCheckDate).toBe('2026-11-26');
  });

  it('refuses a visit for a cow on another farm', async () => {
    const cow = await repo.addCow(farmA, '88');
    await expect(repo.addVisit({
      farmId: farmB, cowId: cow.id, date: '2026-11-12',
      feet: [{ foot: 'LF', claw: 'both', problemIds: ['p-routine'] }], treatmentIds: [], recheck: { kind: 'none' },
    })).rejects.toThrow();
  });

  it('mark checked closes the recheck and can schedule a new one', async () => {
    const cow = await repo.addCow(farmA, '99');
    const v = await repo.addVisit({
      farmId: farmA, cowId: cow.id, date: '2026-11-01',
      feet: [{ foot: 'RR', claw: 'inner', problemIds: ['p-wld'] }], treatmentIds: [], recheck: { kind: 'weeks', weeks: 1 },
    });
    const follow = await repo.markChecked(farmA, v.id, '2026-11-08', { kind: 'weeks', weeks: 1 });
    const due = await repo.listDue(farmA);
    expect(due.map((d) => d.visit.id)).toEqual([follow!.id]);
    expect(follow!.nextCheckDate).toBe('2026-11-15');
  });

  it('flags the same problem on the same foot twice', async () => {
    const cow = await repo.addCow(farmA, '55');
    for (const date of ['2026-09-01', '2026-11-01']) {
      await repo.addVisit({
        farmId: farmA, cowId: cow.id, date,
        feet: [{ foot: 'LR', claw: 'outer', problemIds: ['p-sole-ulcer'] }], treatmentIds: [], recheck: { kind: 'none' },
      });
    }
    const flags = repeatFindings(await repo.listCowVisits(farmA, cow.id), (id) => id === 'p-routine');
    expect(flags).toEqual([{ foot: 'LR', problemId: 'p-sole-ulcer', count: 2 }]);
  });
});
