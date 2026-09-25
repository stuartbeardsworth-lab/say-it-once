import { Store } from './store';

/** A store backed by an in-memory IndexedDB with its own fresh database. */
export async function freshStore(): Promise<Store> {
  const store = new Store(`test-${crypto.randomUUID()}`);
  const opened = await store.open();
  if (!opened.ok) throw opened.problem;
  return store;
}
