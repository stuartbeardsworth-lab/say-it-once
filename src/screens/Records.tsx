import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog } from '../components/Dialog';
import { SaveStatus, type SaveState } from '../components/SaveStatus';
import { TextField } from '../components/TextField';
import { blank } from '../domain/blank';
import type { Item, ProfileData } from '../domain/types';
import { messageFor, useAutosave } from '../forms/useAutosave';
import { useItemDraft } from '../forms/useItemDraft';
import { PageTop } from '../shell/PageTop';
import { useRecords } from '../store/hooks';
import { useRecordId, useStore } from '../store/StoreContext';
import { SharedCopiesNote } from '../features/deliver/SharedCopiesNote';

// My records (decision Q2): several records per person, one per incident,
// with a switcher, rename and delete. The last record can't be deleted.

export function Records() {
  const records = useRecords();
  const activeId = useRecordId();
  const { store, switchRecord } = useStore();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>My records</h1>
      <p>
        Keep a separate record for each injury or illness, so each one stays clear. Everything you add goes into the
        record being shown.
      </p>
      <p role="status" className="quiet-status">
        {message}
      </p>

      {records === undefined ? (
        <p>Loading…</p>
      ) : (
        <ul className="record-list">
          {records.map((r) => (
            <li key={r.id} className="note-card">
              <p className="record-name">
                {r.data.name}
                {r.id === activeId && <span className="record-current"> (being shown)</span>}
              </p>
              <div className="button-row">
                {r.id !== activeId && (
                  <Button
                    variant="primary"
                    onPress={() =>
                      void switchRecord(r.id).then(
                        () => setMessage(`Now showing “${r.data.name}”.`),
                        (e: unknown) => setMessage(messageFor(e)),
                      )
                    }
                  >
                    Show this record
                  </Button>
                )}
                <RenameRecord record={r} />
                {records.length > 1 && (
                  <ConfirmDialog
                    trigger={<Button variant="danger">Delete</Button>}
                    title={`Delete “${r.data.name}”?`}
                    confirmLabel="Delete this record"
                    pendingLabel="Deleting…"
                    onConfirm={async () => {
                      if (r.id === activeId) {
                        const other = records.find((o) => o.id !== r.id);
                        if (other) await switchRecord(other.id);
                      }
                      await store.deleteRecord(r.id);
                      setMessage(`“${r.data.name}” was deleted.`);
                    }}
                  >
                    <p>
                      Everything in this record will be deleted from this device: every entry, note, photo and
                      document. This can’t be undone.
                    </p>
                    <SharedCopiesNote recordId={r.id} />
                  </ConfirmDialog>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button onPress={() => setAdding(true)}>Add another record</Button>
      <NameDialog
        isOpen={adding}
        onOpenChange={setAdding}
        title="Add another record"
        initial=""
        submitLabel="Add record"
        onSubmit={async (name) => {
          const id = await store.createRecord(name);
          await switchRecord(id);
          setMessage(`“${name}” was added and is now being shown.`);
        }}
      />

      <h2>Your name</h2>
      <PersonName />
    </>
  );
}

function RenameRecord({ record }: { record: Item<'recordMeta'> }) {
  const { store } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setOpen(true)}>Rename</Button>
      <NameDialog
        isOpen={open}
        onOpenChange={setOpen}
        title="Rename this record"
        initial={record.data.name}
        submitLabel="Save name"
        onSubmit={(name) =>
          store.save('recordMeta', record.id, { ...record.data, name }, { id: record.id }).then(() => undefined)
        }
      />
    </>
  );
}

interface NameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
}

function NameDialog({ isOpen, onOpenChange, title, initial, submitLabel, onSubmit }: NameDialogProps) {
  const [dirty, setDirty] = useState(false);
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setDirty(false);
        onOpenChange(open);
      }}
      title={title}
      hasUnsavedChanges={dirty}
      unsavedLabel="the name"
    >
      {(close, { finish }) => (
        <NameForm
          initial={initial}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onDirtyChange={setDirty}
          onCancel={close}
          onDone={() => {
            setDirty(false);
            finish();
          }}
        />
      )}
    </Dialog>
  );
}

interface NameFormProps {
  initial: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onDone: () => void;
}

// Mounted each time the dialog opens, so it always starts from `initial`.
function NameForm({ initial, submitLabel, onSubmit, onDirtyChange, onCancel, onDone }: NameFormProps) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<SaveState>({ kind: 'idle' });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() === '') {
          setError('Give this record a name, such as “Fall at work, March 2026”.');
          return;
        }
        setStatus({ kind: 'saving' });
        onSubmit(name.trim()).then(onDone, (err: unknown) => setStatus({ kind: 'failed', message: messageFor(err) }));
      }}
    >
      <TextField
        label="Name of the record"
        hint="For example, what happened and when: “Fall at work, March 2026”."
        value={name}
        onChange={(v) => {
          setName(v);
          setError(undefined);
          onDirtyChange(v !== initial);
        }}
        errorMessage={error}
        autoFocus
      />
      <SaveStatus status={status} onDismiss={() => setStatus({ kind: 'idle' })} />
      <div className="dialog-actions">
        <Button onPress={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={status.kind === 'saving'}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PersonName() {
  const { store, status } = useStore();
  const { draft, updateData } = useItemDraft<'profile'>(
    () => store.getProfile(),
    () => blank('profile'),
    status.kind === 'opening' ? null : 'profile',
  );
  if (!draft) return <p>Loading…</p>;
  return <PersonNameField key={draft.id} id={draft.id} data={draft.data} onChange={(d) => updateData(() => d)} />;
}

function PersonNameField({ id, data, onChange }: { id: string; data: ProfileData; onChange: (d: ProfileData) => void }) {
  const { store } = useStore();
  const autosave = useAutosave(data, async (d) => {
    await store.save('profile', null, d, { id });
  });
  return (
    <>
      <TextField
        label="Your name (optional)"
        hint="Used on anything you create to share, in every record. It saves as you type."
        value={data.personName}
        onChange={(personName) => onChange({ personName })}
        onBlur={() => void autosave.flush()}
        autoComplete="name"
      />
      <SaveStatus status={autosave.status} onDismiss={autosave.dismiss} />
    </>
  );
}
