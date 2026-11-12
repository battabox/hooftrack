import Dexie, { type Table } from 'dexie';
import type { Cow, Farm, OptionItem, Visit } from './types';
import { DEFAULT_FARM_NAME, OLD_DEFAULT_FARM_NAME } from './defaults';

export const SCHEMA_V1 = {
  farms: 'id, name',
  // Unique compound index: the same cow number cannot exist twice on one farm.
  cows: 'id, farmId, &[farmId+numberKey]',
  visits: 'id, farmId, cowId, [farmId+cowId]',
  options: 'id, kind, order',
};

export class HoofDB extends Dexie {
  farms!: Table<Farm, string>;
  cows!: Table<Cow, string>;
  visits!: Table<Visit, string>;
  options!: Table<OptionItem, string>;

  constructor(name = 'hooftrack') {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    // v2: rename the auto-created "Demo Farm" (only farm name changes; cows and visits keep their farmId).
    this.version(2)
      .stores(SCHEMA_V1)
      .upgrade(async (tx) => {
        const farms = tx.table<Farm, string>('farms');
        const all = await farms.toArray();
        if (all.some((f) => f.name === DEFAULT_FARM_NAME)) return; // never create a duplicate name
        const old = all.find((f) => f.name === OLD_DEFAULT_FARM_NAME);
        if (old) await farms.update(old.id, { name: DEFAULT_FARM_NAME });
      });
  }
}
