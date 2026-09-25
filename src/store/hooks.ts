import type { Item, ItemType } from '../domain/types';
import { useRecordId, useStore } from './StoreContext';
import { useLiveQuery } from './useLiveQuery';

// Live reads for screens. Each returns undefined until the first read, then
// stays up to date as anything changes, in this tab or another.

export function useItems<T extends ItemType>(type: T): Item<T>[] | undefined {
  const { store } = useStore();
  const recordId = useRecordId();
  return useLiveQuery(
    () => (recordId ? store.list(recordId, type) : Promise.resolve([])),
    `items:${recordId ?? ''}:${type}`,
  );
}

export function useRecords(): Item<'recordMeta'>[] | undefined {
  const { store } = useStore();
  return useLiveQuery(() => store.listRecords(), 'records');
}

export function useRecordName(): string | undefined {
  const records = useRecords();
  const recordId = useRecordId();
  return records?.find((r) => r.id === recordId)?.data.name;
}
