import { useState } from 'react';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { QuickNoteCard } from '../features/quickNotes/QuickNoteCard';
import { useQuickNoteDialogs } from '../features/quickNotes/useQuickNoteDialogs';
import { navigate, RouteLink } from '../router';
import { DeviceOnlyBanner } from '../shell/DeviceOnlyBanner';
import { useItems } from '../store/hooks';

export function Home() {
  const notes = useItems('quickNote');
  const { dialogs, write, edit, file } = useQuickNoteDialogs();
  const [choosing, setChoosing] = useState(false);
  const latest = notes?.at(-1);

  return (
    <>
      <h1 tabIndex={-1}>Keep everything together, so you don&rsquo;t have to start again.</h1>
      <DeviceOnlyBanner />

      <nav aria-label="What would you like to do?" className="tasks">
        <Button variant="primary" onPress={() => setChoosing(true)}>
          Add something
        </Button>
        <Button variant="primary" onPress={write}>
          Quick Note
        </Button>
      </nav>

      {latest && (
        <section aria-labelledby="latest-note">
          <h2 id="latest-note">Your latest Quick Note</h2>
          <QuickNoteCard note={latest} onEdit={edit} onFile={file} showDelete={false} />
          <p>
            <RouteLink to="quick-notes">See all Quick Notes</RouteLink>
          </p>
        </section>
      )}

      <Dialog isOpen={choosing} onOpenChange={setChoosing} title="Add something">
        {(close, { finish }) => (
          <>
            <p>What would you like to add?</p>
            <div className="chooser">
              <Button
                onPress={() => {
                  finish();
                  navigate('what');
                }}
              >
                What happened
              </Button>
              <Button
                onPress={() => {
                  finish();
                  write();
                }}
              >
                Quick Note
              </Button>
            </div>
            <p className="field-hint">
              Appointments, treatment, costs, letters and contacts arrive in the next part of the build.
            </p>
            <div className="dialog-actions">
              <Button onPress={close}>Cancel</Button>
            </div>
          </>
        )}
      </Dialog>
      {dialogs}
    </>
  );
}
