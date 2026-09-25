import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SaveStatus } from '../components/SaveStatus';
import { TextArea } from '../components/TextField';
import { blank } from '../domain/blank';
import { useAutosave } from '../forms/useAutosave';
import { StorageProblem, type StorageProblemKind } from '../store/problems';
import { newItemId } from '../store/store';
import { useStore } from '../store/StoreContext';
import { useLiveQuery } from '../store/useLiveQuery';

// Stage 2 review: real saving to this device, and switches that make saving
// fail on purpose so the error messages can be seen. Part of the Building
// blocks page, and removed with it before the tester release.

const failureChoices: { value: StorageProblemKind | ''; label: string }[] = [
  { value: '', label: 'No, save normally' },
  { value: 'full', label: 'Yes: the device is full' },
  { value: 'blocked', label: 'Yes: the browser is blocking storage' },
  { value: 'closed', label: 'Yes: the browser closed storage' },
];

function when(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function StorageReview() {
  const { store, status, simulateUnavailable } = useStore();
  const recordId = status.kind === 'opening' ? null : status.recordId;
  const [text, setText] = useState('');
  const [noteId, setNoteId] = useState(newItemId);
  const [nextFailure, setNextFailure] = useState<StorageProblemKind | ''>('');

  const notes = useLiveQuery(
    () => (recordId ? store.list(recordId, 'quickNote') : Promise.resolve([])),
    `quick-notes:${recordId ?? ''}`,
  );

  const autosave = useAutosave(text, async (value) => {
    if (!recordId) throw new StorageProblem('unavailable');
    if (value.trim() === '') return;
    try {
      await store.save('quickNote', recordId, blank('quickNote', { text: value }), { id: noteId });
    } finally {
      // Any pretend failure has now been used up (or not needed).
      setNextFailure('');
      store.queue.simulateNextFailure(null);
    }
  });

  function clearEditor() {
    setText('');
    setNoteId(newItemId());
    autosave.dismiss();
  }

  function startNewNote() {
    void autosave.flush();
    clearEditor();
  }

  return (
    <section aria-labelledby="bb-storage">
      <h2 id="bb-storage">Saving on this device</h2>
      <p>
        This saves real Quick Notes into your record on this device. Type below, wait a moment, then reload the page:
        your note will still be in the list. Open this page in a second tab and the list there updates too.
      </p>

      <TextArea
        label="Try a Quick Note"
        hint="Saves as you type. A few words are enough."
        value={text}
        onChange={setText}
        onBlur={() => void autosave.flush()}
        rows={3}
      />
      <SaveStatus status={autosave.status} onDismiss={autosave.dismiss} />
      <div className="button-row">
        <Button onPress={startNewNote}>Start a new note</Button>
      </div>

      <h3>Quick Notes saved on this device</h3>
      {notes === undefined ? (
        <p>Loading…</p>
      ) : notes.length === 0 ? (
        <p>None yet.</p>
      ) : (
        <ul className="saved-list">
          {notes.map((note) => (
            <li key={note.id}>
              <p>{note.data.text}</p>
              <p className="field-hint">Saved {when(note.updatedAt)}</p>
              <ConfirmDialog
                trigger={<Button variant="danger">Delete this note</Button>}
                title="Delete this Quick Note?"
                confirmLabel="Delete note"
                pendingLabel="Deleting…"
                onConfirm={async () => {
                  await store.deleteItem(note.id);
                  // Don't save the deleted note again from the editor.
                  if (note.id === noteId) clearEditor();
                }}
              >
                <p>&ldquo;{note.data.text.slice(0, 80)}&rdquo; will be deleted from this device.</p>
              </ConfirmDialog>
            </li>
          ))}
        </ul>
      )}

      <h3>Make saving fail</h3>
      <div className="field">
        <label className="field-label" htmlFor="next-failure">
          Should the next save fail?
        </label>
        <span className="field-hint" id="next-failure-hint">
          Pick a reason, then type in the note above. Only the next save fails; the one after works again.
        </span>
        <select
          id="next-failure"
          aria-describedby="next-failure-hint"
          className="field-input"
          value={nextFailure}
          onChange={(e) => {
            const kind = e.target.value as StorageProblemKind | '';
            setNextFailure(kind);
            store.queue.simulateNextFailure(kind || null);
          }}
        >
          {failureChoices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <p>
        Or pretend storage stopped working completely, as it might in a private window. A message appears at the top
        of every screen, and nothing can be saved until you press &ldquo;Try again&rdquo; in it.
      </p>
      <Button onPress={simulateUnavailable}>Pretend storage is unavailable</Button>
    </section>
  );
}
