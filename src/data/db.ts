import Dexie, { type Table } from 'dexie';
import type { Cow, Farm, OptionItem, Visit } from './types';

export class HoofDB extends Dexie {
  farms!: Table<Farm, string>;
  cows!: Table<Cow, string>;
  visits!: Table<Visit, string>;
  options!: Table<OptionItem, string>;

  constructor(name = 'hooftrack') {
    super(name);
    this.version(1).stores({
      farms: 'id, name',
      // Unique compound index: the same cow number cannot exist twice on one farm.
      cows: 'id, farmId, &[farmId+numberKey]',
      visits: 'id, farmId, cowId, [farmId+cowId]',
      options: 'id, kind, order',
    });
  }
}
