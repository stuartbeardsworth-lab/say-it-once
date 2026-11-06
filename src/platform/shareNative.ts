// Handing a finished file to the person from inside the iPhone or Android
// app (docs/architecture.md, "Delivery"; the browser version is in
// src/features/deliver/deliver.ts).
//
// The phone's share sheet takes a file on disk, not a file held in the page,
// so the file is written to the app's own cache folder, shared, and then
// deleted again. The cache copy is deliberately short-lived: a report can
// hold everything the person has written, and "deleting means deleted
// everywhere" (CLAUDE.md) applies to it too. The delete runs whether the
// share succeeded, failed or was closed without choosing.

import type { DeliveryResult } from '../features/deliver/deliver';

/** The file as base64, which is the only form Capacitor's Filesystem takes. */
async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // In pieces, so a large PDF doesn't overflow the argument list.
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

/** True when the share sheet was closed without picking an app. */
function wasCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}

export async function shareFileNative(file: File, title: string): Promise<DeliveryResult> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  // A fresh name each time, so two shares in a row can't collide.
  const path = `share-${Date.now().toString(36)}-${file.name}`;
  let written = false;

  try {
    await Filesystem.writeFile({
      path,
      data: await toBase64(file),
      directory: Directory.Cache,
    });
    written = true;

    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({ title, files: [uri] });
    return { outcome: 'shared' };
  } catch (error) {
    if (wasCancelled(error)) return { outcome: 'cancelled' };
    return { outcome: 'failed', reason: 'The share options couldn’t take this file.' };
  } finally {
    if (written) {
      // Never leave a copy of the record lying in the cache folder.
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
    }
  }
}
