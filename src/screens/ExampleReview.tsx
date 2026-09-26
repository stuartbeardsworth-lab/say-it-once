import { useState } from 'react';
import { Button } from '../components/Button';
import { today } from '../domain/dates';
import { exampleRecord } from '../fixtures/example';
import { messageFor } from '../forms/useAutosave';
import { navigate } from '../router';
import { useStore } from '../store/StoreContext';

// Stage 4 review: load the made-up example record, with private entries of
// every kind, to see what each report contains. Part of the Building blocks
// page, and removed with it before the tester release.

export function ExampleReview() {
  const { store, switchRecord } = useStore();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setMessage('');
    try {
      const ex = exampleRecord(today());
      const id = await store.importRecord(ex.recordName, ex.entries);
      await switchRecord(id);
      navigate('use');
    } catch (e) {
      setMessage(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="bb-example">
      <h2 id="bb-example">Try the reports</h2>
      <p>
        Load a made-up record for “Sam Taylor”, who broke a wrist in a fall at work. It is added as a separate record, so
        yours isn’t changed. Every entry marked private contains the word PRIVATE, so you can check none of them appear in
        any report. You can delete it in My records.
      </p>
      <Button onPress={() => void load()} isDisabled={busy}>
        {busy ? 'Loading…' : 'Load the example record'}
      </Button>
      <p role="status" className="quiet-status">
        {message}
      </p>
    </section>
  );
}
