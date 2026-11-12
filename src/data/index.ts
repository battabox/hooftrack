import { HoofDB } from './db';
import { createRepo } from './repo';

export const db = new HoofDB();
export const repo = createRepo(db);
export * from './types';
export { DuplicateCowError } from './repo';
export type { DueItem, TrimListEntry } from './repo';
