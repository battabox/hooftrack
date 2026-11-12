import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { HoofDB } from './db';
import { createRepo, DuplicateCowError, type Repo } from './repo';
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
  it('pre-creates Demo Farm', async () => {
    expect((await repo.listFarms()).map((f) => f.name)).toContain('Demo Farm');
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
