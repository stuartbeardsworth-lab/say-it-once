import { useCallback, useEffect, useState } from 'react';
import type { ItemDataMap, ItemType } from '../domain/types';
import { newItemId } from '../store/store';
import { useStore } from '../store/StoreContext';

// Loads one item into a form and keeps its ID, so a form that saves as the
// person types always updates the same item. Returns undefined while
// loading. The form owns the data from then on; changes made in another
// tab at the same moment are not merged in (that arrives with sync).

export function useItemDraft<T extends ItemType>(
  load: () => Promise<{ id: string; data: ItemDataMap[T] } | undefined>,
  empty: () => ItemDataMap[T],
  key: string,
) {
  const { store } = useStore();
  const [draft, setDraft] = useState<{ key: string; id: string; data: ItemDataMap[T] }>();

  useEffect(() => {
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

  const setData = useCallback((data: ItemDataMap[T]) => {
    setDraft((d) => (d ? { ...d, data } : d));
  }, []);

  const ready = draft?.key === key ? draft : undefined;
  return { draft: ready, setData };
}
