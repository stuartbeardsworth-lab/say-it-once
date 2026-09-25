import { useEffect, useState } from 'react';
import { useStore } from './StoreContext';

/** A temporary address for showing a stored file, such as a photo. */
export function useFileUrl(fileId: string | null): string | null {
  const { store } = useStore();
  const [url, setUrl] = useState<{ fileId: string; url: string } | null>(null);

  useEffect(() => {
    if (!fileId) return;
    let objectUrl: string | null = null;
    let current = true;
    store.getFile(fileId).then(
      (row) => {
        if (!current || !row) return;
        objectUrl = URL.createObjectURL(row.blob);
        setUrl({ fileId, url: objectUrl });
      },
      () => undefined,
    );
    return () => {
      current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [store, fileId]);

  return url && url.fileId === fileId ? url.url : null;
}
