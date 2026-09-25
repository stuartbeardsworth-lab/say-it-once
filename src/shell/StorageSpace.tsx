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
          {space.quotaBytes !== null && `, out of ${formatBytes(space.quotaBytes)} this browser allows`}.
        </p>
      )}
      {space.persisted === true && <p>This browser has agreed to keep your record, even if the device runs low on space.</p>}
      {space.persisted === false && (
        <p>
          This browser hasn’t yet agreed to keep your record permanently. If the device runs very low on space, it
          could clear it. Browsers usually agree once Say It Once is used regularly or added to the home screen.
        </p>
      )}
    </>
  );
}
