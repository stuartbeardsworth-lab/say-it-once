import { describe, expect, it, vi, afterEach } from 'vitest';
import { isNative, platform } from './index';
import { canShareFile, downloadFile, shareFile } from '../features/deliver/deliver';

// The point of these: adding the phone apps must not change the website by
// so much as a step. Everything here runs as a browser does, and asserts the
// web path is still the one taken.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('platform', () => {
  it('is not native in a browser', () => {
    expect(isNative()).toBe(false);
    expect(platform()).toBe('web');
  });
});

describe('delivery on the web is unchanged', () => {
  const file = new File(['hello'], 'report.pdf', { type: 'application/pdf' });

  it('says it cannot share when the browser has no share for files', () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined, canShare: undefined });
    expect(canShareFile(file)).toBe(false);
  });

  it('says it can share when the browser offers it for files', () => {
    vi.stubGlobal('navigator', { ...navigator, share: () => Promise.resolve(), canShare: () => true });
    expect(canShareFile(file)).toBe(true);
  });

  it('still uses the browser share, not the phone one', async () => {
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, share, canShare: () => true });
    await expect(shareFile(file, 'Report')).resolves.toEqual({ outcome: 'shared' });
    expect(share).toHaveBeenCalledOnce();
  });

  it('reports a closed share sheet as cancelled, not failed', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('no', 'AbortError')));
    vi.stubGlobal('navigator', { ...navigator, share, canShare: () => true });
    await expect(shareFile(file, 'Report')).resolves.toEqual({ outcome: 'cancelled' });
  });

  it('still downloads through a link in a browser', () => {
    // jsdom has no object URLs of its own.
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:test', revokeObjectURL: () => undefined });
    expect(downloadFile(file)).toEqual({ outcome: 'downloading' });
  });
});
