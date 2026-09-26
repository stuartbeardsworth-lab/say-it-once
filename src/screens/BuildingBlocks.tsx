import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog } from '../components/Dialog';
import { SaveStatus, type SaveState } from '../components/SaveStatus';
import { TextArea, TextField } from '../components/TextField';
import { PageTop } from '../shell/PageTop';
import { TryExample } from '../features/example/TryExample';
import { SpeedCheck } from '../features/review/SpeedCheck';
import { StorageReview } from './StorageReview';

// A review page for the Stage 1 building blocks, so each can be tried with a
// keyboard and a screen reader before real screens use them. Nothing here
// stores anything. Remove before the tester release in Stage 6.

export function BuildingBlocks() {
  const [organisation, setOrganisation] = useState('');
  const [showFieldError, setShowFieldError] = useState(false);
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveState>({ kind: 'idle' });
  const [nextDeleteFails, setNextDeleteFails] = useState(false);
  const [deleteResult, setDeleteResult] = useState('');

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Building blocks</h1>
      <p>
        This page is for reviewing the parts Say It Once is built from. Nothing here is saved. It will be removed
        before release.
      </p>

      <section aria-labelledby="bb-dialog">
        <h2 id="bb-dialog">Dialog</h2>
        <p>Focus should move into the dialog, stay inside it when you press Tab, and come back here when it closes.</p>
        <Dialog trigger={<Button>Open an example dialog</Button>} title="Example dialog">
          {(close) => (
            <>
              <TextField label="Your name" hint="Only used on this page." />
              <div className="dialog-actions">
                <Button variant="secondary" onPress={close}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={close}>
                  Done
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </section>

      <section aria-labelledby="bb-confirm">
        <h2 id="bb-confirm">Confirm before deleting</h2>
        <p>Focus should start on Cancel. Escape should cancel.</p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={nextDeleteFails}
            onChange={(e) => setNextDeleteFails(e.target.checked)}
          />
          Pretend the next delete fails
        </label>
        <ConfirmDialog
          trigger={<Button variant="danger">Delete example item</Button>}
          title="Delete this example?"
          confirmLabel="Delete example"
          pendingLabel="Deleting…"
          onConfirm={async () => {
            setDeleteResult('');
            await new Promise((resolve) => setTimeout(resolve, 400));
            if (nextDeleteFails) throw new Error('Pretend failure');
            setDeleteResult('The example was deleted. (Nothing real was removed.)');
          }}
        >
          <p>This is only an example. In the app, this is where you would be told exactly what will be deleted.</p>
        </ConfirmDialog>
        <p role="status">{deleteResult}</p>
      </section>

      <section aria-labelledby="bb-fields">
        <h2 id="bb-fields">Text fields</h2>
        <TextField
          label="Organisation"
          hint="For example, the hospital or GP surgery."
          value={organisation}
          onChange={setOrganisation}
          errorMessage={showFieldError ? 'Enter the organisation, or leave this for later.' : undefined}
        />
        <Button onPress={() => setShowFieldError((v) => !v)}>
          {showFieldError ? 'Hide the error message' : 'Show an error message'}
        </Button>
        <TextArea label="What happened?" hint="A few words are enough." value={notes} onChange={setNotes} />
      </section>

      <section aria-labelledby="bb-save">
        <h2 id="bb-save">Save status</h2>
        <p>A failure message should stay until you dismiss it.</p>
        <div className="button-row">
          <Button onPress={() => setSaveStatus({ kind: 'saving' })}>Show &ldquo;Saving&rdquo;</Button>
          <Button onPress={() => setSaveStatus({ kind: 'saved' })}>Show &ldquo;Saved&rdquo;</Button>
          <Button
            onPress={() =>
              setSaveStatus({
                kind: 'failed',
                message: 'This device has run out of space. Free up some space, then try again.',
              })
            }
          >
            Show a failed save
          </Button>
        </div>
        <SaveStatus status={saveStatus} onDismiss={() => setSaveStatus({ kind: 'idle' })} />
      </section>

      <TryExample />
      <SpeedCheck />

      <StorageReview />
    </>
  );
}
