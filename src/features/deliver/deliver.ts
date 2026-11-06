// Getting a finished file off the app (docs/architecture.md, "Delivery"):
// through the phone's share options where they can take files, otherwise
// as a download. Each result says only what is actually known:
//
// - shared: the person picked an app and the file was passed to it. Whether
//   they then sent the email is up to that app, so nothing more is claimed.
// - cancelled: the share options were closed without choosing. Not sent.
// - downloading: the browser was given the file to save. Browsers never
//   tell a page when a download has finished, so this is not called "saved".
// - failed: something went wrong; the person is told plainly.

import { isNative } from '../../platform';
import { shareFileNative } from '../../platform/shareNative';

export type DeliveryResult =
  | { outcome: 'shared' }
  | { outcome: 'cancelled' }
  | { outcome: 'downloading' }
  | { outcome: 'failed'; reason: string };

/** Whether this device can hand a file of this kind to the share options. */
export function canShareFile(file: File): boolean {
  // The iPhone and Android apps always have the phone's own share sheet.
  if (isNative()) return true;
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * On an iPhone or iPad home-screen app, downloads don't work reliably;
 * saving goes through the share options ("Save to Files") instead.
 */
export function isAppleHomeScreenApp(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function shareFile(file: File, title: string): Promise<DeliveryResult> {
  // Inside the apps the share sheet takes a file on disk, not one held in
  // the page, so it goes through the cache folder (see platform/shareNative).
  if (isNative()) return shareFileNative(file, title);
  try {
    await navigator.share({ files: [file], title });
    return { outcome: 'shared' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { outcome: 'cancelled' };
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return { outcome: 'failed', reason: 'The phone didn’t allow the share options to open. Please tap Share again.' };
    }
    return { outcome: 'failed', reason: 'The share options couldn’t take this file.' };
  }
}

export function downloadFile(file: File): DeliveryResult {
  // A download link does nothing inside an app's web view; the share sheet
  // (“Save to Files”, “Save to Drive”) is how a file is kept there instead,
  // so DeliverFile hides this button on a phone app.
  if (isNative()) {
    return { outcome: 'failed', reason: 'Use Share to save this file on your phone.' };
  }
  let url: string | null = null;
  try {
    url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.rel = 'noopener';
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    return { outcome: 'downloading' };
  } catch {
    return { outcome: 'failed', reason: 'The browser didn’t accept the download.' };
  } finally {
    // Give the browser time to start reading the file before letting it go.
    const done = url;
    if (done) setTimeout(() => URL.revokeObjectURL(done), 60_000);
  }
}

/** A file name that works on every system: letters, numbers, spaces and dashes only. */
export function safeFileName(...parts: string[]): string {
  const cleaned = parts
    .map((p) => p.normalize('NFKD').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' - ');
  return cleaned.slice(0, 80).trim() || 'Say It Once';
}
