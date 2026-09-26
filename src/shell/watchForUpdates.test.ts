import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchForUpdates } from './watchForUpdates';

function fakeDocument() {
  const listeners = new Set<() => void>();
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    fire() {
      for (const l of listeners) l();
    },
    listeners,
  };
}

describe('watchForUpdates', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('checks when the app opens, when it comes back on screen, and every hour', () => {
    vi.useFakeTimers();
    const registration = { update: vi.fn(() => Promise.resolve(undefined)) };
    const doc = fakeDocument();
    const stop = watchForUpdates(registration, doc as unknown as Document);
    expect(registration.update).toHaveBeenCalledTimes(1);

    doc.visibilityState = 'hidden';
    doc.fire();
    expect(registration.update).toHaveBeenCalledTimes(1);
    doc.visibilityState = 'visible';
    doc.fire();
    expect(registration.update).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(3);

    stop();
    doc.fire();
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(3);
    expect(doc.listeners.size).toBe(0);
  });

  it('carries on quietly when a check fails, for example offline', async () => {
    const registration = { update: vi.fn(() => Promise.reject(new Error('offline'))) };
    const stop = watchForUpdates(registration, fakeDocument() as unknown as Document);
    await Promise.resolve();
    expect(registration.update).toHaveBeenCalledTimes(1);
    stop();
  });
});
