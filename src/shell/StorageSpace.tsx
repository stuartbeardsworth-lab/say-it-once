import { useEffect, useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { StorageSpace as Space } from '../store/store';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return 'less than 1 MB';
  if (bytes < 1024 * 1024 * 1024) return `about ${Math.round(bytes / (1024 * 1024))} MB`;
  return `about ${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// What the browser says about space and whether it will keep the record.
export function StorageSpace() {
  const { store, status } = useStore();
  const [space, setSpace] = useState<Space | null>(null);

  useEffect(() => {
    if (status.kind === 'opening') return;
    let current = true;
    store.space().then(
      (s) => {
        if (current) setSpace(s);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [store, status]);

  if (!space) return null;
  return (
    <>
      {space.usedBytes !== null && (
        <p>
          Say It Once is using {formatBytes(space.usedBytes)} of storage on this device
          {space.quotaBytes !== null && `, and has room for ${formatBytes(space.quotaBytes)}`}.
        </p>
      )}
      {space.persisted === true && <p>This browser has agreed to keep your record, even if the device runs low on space.</p>}
      {space.persisted === false && (
        <p>
          If this device runs very low on space, the browser could clear your record. Using Say It Once regularly, or
          adding it to your home screen, usually stops that. A backup keeps you safe either way.
        </p>
      )}
    </>
  );
}
