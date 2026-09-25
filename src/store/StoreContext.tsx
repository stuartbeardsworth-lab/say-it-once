import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StorageProblem } from './problems';
import { Store } from './store';

// Opens the store when the app starts and tells every screen whether saving
// is possible (docs/architecture.md, "Start-up check").

export type StoreStatus =
  | { kind: 'opening' }
  | { kind: 'ready'; recordId: string }
  | { kind: 'unavailable'; problem: StorageProblem; recordId: string | null };

interface StoreContextValue {
  store: Store;
  status: StoreStatus;
  /** Runs the start-up check again, for "Try again". */
  reopen: () => void;
  /** For the review page only: behave as if storage had failed at start-up. */
  simulateUnavailable: () => void;
  /** Shows another record, and remembers the choice. */
  switchRecord: (recordId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

async function start(store: Store): Promise<StoreStatus> {
  const opened = await store.open();
  if (opened.ok) return { kind: 'ready', recordId: await store.ensureRecord() };
  const recordId = await store.findRecord().catch(() => null);
  return { kind: 'unavailable', problem: opened.problem, recordId };
}

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [status, setStatus] = useState<StoreStatus>({ kind: 'opening' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    start(store).then(
      (next) => {
        if (current) setStatus(next);
      },
      (error: unknown) => {
        const problem = new StorageProblem('unknown', error);
        store.queue.refuse(problem);
        if (current) setStatus({ kind: 'unavailable', problem, recordId: null });
      },
    );
    return () => {
      current = false;
    };
  }, [store, attempt]);

  const reopen = useCallback(() => {
    setStatus({ kind: 'opening' });
    setAttempt((n) => n + 1);
  }, []);

  const simulateUnavailable = useCallback(() => {
    const { problem } = store.simulateUnavailable();
    setStatus((s) => ({ kind: 'unavailable', problem, recordId: s.kind === 'opening' ? null : s.recordId }));
  }, [store]);

  const switchRecord = useCallback(
    async (recordId: string) => {
      await store.setActiveRecord(recordId);
      setStatus((s) => (s.kind === 'ready' ? { kind: 'ready', recordId } : s));
    },
    [store],
  );

  return (
    <StoreContext.Provider value={{ store, status, reopen, simulateUnavailable, switchRecord }}>
      {children}
    </StoreContext.Provider>
  );
}

/** The record being shown, or null while storage opens or when there is none. */
export function useRecordId(): string | null {
  const { status } = useStore();
  return status.kind === 'opening' ? null : status.recordId;
}

export function useStore(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
