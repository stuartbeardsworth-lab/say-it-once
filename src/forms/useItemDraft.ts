import { useCallback, useEffect, useState } from 'react';
import type { ItemDataMap, ItemType } from '../domain/types';
import { newItemId } from '../store/store';
import { useStore } from '../store/StoreContext';

// Loads one item into a form and keeps its ID, so a form that saves as the
// person types always updates the same item. Returns undefined while
// loading, and while `key` is null (storage not ready yet), so nobody can
// type into a form that isn't connected to a record. The form owns the data from then on; changes made in another
// tab at the same moment are not merged in (that arrives with sync).

export function useItemDraft<T extends ItemType>(
  load: () => Promise<{ id: string; data: ItemDataMap[T] } | undefined>,
  empty: () => ItemDataMap[T],
  key: string | null,
) {
  const { store } = useStore();
  const [draft, setDraft] = useState<{ key: string; id: string; data: ItemDataMap[T] }>();


  useEffect(() => {
    if (key === null) return;
    let current = true;
    load().then(
      (found) => {
        if (current) setDraft({ key, id: found?.id ?? newItemId(), data: found?.data ?? empty() });
      },
      () => {
        if (current) setDraft({ key, id: newItemId(), data: empty() });
      },
    );
    return () => {
      current = false;
    };
    // load and empty are read once per key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, key]);

  // Takes an update function, so quick changes to several fields build on
  // each other instead of the later one overwriting the earlier.
  const updateData = useCallback((update: (data: ItemDataMap[T]) => ItemDataMap[T]) => {
    setDraft((d) => (d ? { ...d, data: update(d.data) } : d));
  }, []);

  const ready = key !== null && draft?.key === key ? draft : undefined;
  return { draft: ready, updateData };
}
