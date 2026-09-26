import { useState } from 'react';
import { Button } from '../../components/Button';
import { today } from '../../domain/dates';
import { exampleRecord } from '../../fixtures/example';
import { messageFor } from '../../forms/useAutosave';
import { navigate, RouteLink } from '../../router';
import { useStore } from '../../store/StoreContext';

// Load the made-up example record, with private entries of every kind, to
// try the reports without using real details. Shown in How to use.

export function TryExample() {
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
    <section aria-labelledby="try-example" className="no-print">
      <h2 id="try-example">Try it with a made-up record</h2>
      <p>
        Load a made-up record for “Sam Taylor”, who broke a wrist in a fall at work, to see what Say It Once can do
        without using your own details. It’s added as a separate record, so yours isn’t changed.
      </p>
      <p>
        The entries marked private have the word PRIVATE in them, so you can see they’re left out of every report. When
        you’re done, delete the example in <RouteLink to="records">My records</RouteLink>.
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
