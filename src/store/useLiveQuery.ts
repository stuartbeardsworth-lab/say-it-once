import { liveQuery } from 'dexie';
import { useEffect, useEffectEvent, useState } from 'react';

// Re-runs a read whenever the data it read changes, in this tab or any other
// tab on this device, so every open screen stays up to date.
//
// `key` names what is being read; change it to start a new query (for
// example when the record changes). Returns undefined until the first read.

export function useLiveQuery<T>(query: () => Promise<T>, key: string): T | undefined {
  const [result, setResult] = useState<{ key: string; value: T }>();
  const run = useEffectEvent(query);

  useEffect(() => {
    const subscription = liveQuery(() => run()).subscribe({
      next: (value) => setResult({ key, value }),
      error: () => undefined,
    });
    return () => subscription.unsubscribe();
  }, [key]);

  return result?.key === key ? result.value : undefined;
}
