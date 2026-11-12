import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { repo } from './index';
import type { OptionItem } from './types';

export const useFarms = () => useLiveQuery(() => repo.listFarms(), []);
export const useCowSearch = (farmId: string, q: string) => useLiveQuery(() => repo.searchCows(farmId, q), [farmId, q]);
export const useCow = (farmId: string, cowId: string) =>
  useLiveQuery(async () => (await repo.getCow(farmId, cowId)) ?? null, [farmId, cowId]);
export const useCowVisits = (farmId: string, cowId: string) => useLiveQuery(() => repo.listCowVisits(farmId, cowId), [farmId, cowId]);
export const useDue = (farmId: string) => useLiveQuery(() => repo.listDue(farmId), [farmId]);
export const useTrimList = (farmId: string) => useLiveQuery(() => repo.listTrimList(farmId), [farmId]);
export const useOptions = () => useLiveQuery(() => repo.listOptions(), []);

export function useOptionMap(): Map<string, OptionItem> {
  const options = useOptions();
  return useMemo(() => new Map((options ?? []).map((o) => [o.id, o])), [options]);
}
