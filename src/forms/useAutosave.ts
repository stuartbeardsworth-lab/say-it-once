import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveState } from '../components/SaveStatus';
import { StorageProblem, ValidationProblem } from '../store/problems';

// Saves long text as the person types (docs/architecture.md, "Typing"):
// 800 ms after they stop, and at once when they leave the field, switch
// tab, or the page is hidden or closed. The text stays in the form whatever
// happens, so a failed save never loses what was written.

export function messageFor(error: unknown): string {
  if (error instanceof StorageProblem) return error.message;
  if (error instanceof ValidationProblem) return Object.values(error.errors)[0] ?? error.message;
  return 'Something stopped Say It Once saving. Reload the page and try again.';
}

export function useAutosave<V>(value: V, save: (value: V) => Promise<void>, delay = 800) {
  const [status, setStatus] = useState<SaveState>({ kind: 'idle' });
  const latest = useRef({ value, save });
  const savedValue = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    latest.current = { value, save };
  });

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const { value: toSave, save: saveNow } = latest.current;
    if (Object.is(toSave, savedValue.current)) return;
    setStatus({ kind: 'saving' });
    try {
      await saveNow(toSave);
      savedValue.current = toSave;
      // Only say "Saved" if nothing newer is still waiting.
      if (Object.is(latest.current.value, toSave)) setStatus({ kind: 'saved' });
    } catch (error) {
      setStatus({ kind: 'failed', message: messageFor(error) });
    }
  }, []);

  useEffect(() => {
    if (Object.is(value, savedValue.current)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  }, [value, delay, flush]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      // Leaving the screen saves too.
      void flush();
    };
  }, [flush]);

  const dismiss = useCallback(() => setStatus({ kind: 'idle' }), []);
  return { status, flush, dismiss };
}
