import { useEffect, useState } from 'react';
import type { SaveState } from '../components/SaveStatus';
import { ValidationProblem } from '../store/problems';
import { messageFor } from './useAutosave';

// State for a form that is saved with a button (an appointment, a cost):
// the entry's fields, its private setting, a message per field from
// validation, and an honest save status.

export function useEntryForm<D extends object>(
  initial: D,
  initialPrivate: boolean,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const [data, setData] = useState<D>(initial);
  const [isPrivate, setPrivate] = useState(initialPrivate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveState>({ kind: 'idle' });

  const changed = JSON.stringify(data) !== JSON.stringify(initial) || isPrivate !== initialPrivate;
  useEffect(() => {
    onDirtyChange?.(changed);
  }, [changed, onDirtyChange]);

  function set<K extends keyof D>(key: K, value: D[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  }

  /** Props for a text field bound to one string field. */
  function text<K extends keyof D>(key: K) {
    return {
      value: String(data[key] ?? ''),
      onChange: (value: string) => set(key, value as D[K]),
      errorMessage: errors[key as string],
    };
  }

  /** Runs a save, showing field errors or a failure message. Resolves true on success. */
  async function submit(save: () => Promise<unknown>): Promise<boolean> {
    setStatus({ kind: 'saving' });
    try {
      await save();
      setStatus({ kind: 'saved' });
      return true;
    } catch (e) {
      if (e instanceof ValidationProblem) {
        setErrors(e.errors);
        setStatus({ kind: 'idle' });
      } else {
        setStatus({ kind: 'failed', message: messageFor(e) });
      }
      return false;
    }
  }

  return {
    data,
    set,
    text,
    isPrivate,
    setPrivate,
    errors,
    setErrors,
    status,
    dismissStatus: () => setStatus({ kind: 'idle' }),
    submit,
    changed,
    saving: status.kind === 'saving',
  };
}
