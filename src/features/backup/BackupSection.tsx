import { useState } from 'react';
import { Button } from '../../components/Button';
import { readableDate } from '../../domain/format';
import { useStore } from '../../store/StoreContext';
import { useLiveQuery } from '../../store/useLiveQuery';
import { DeliverFile } from '../deliver/DeliverFile';
import { backupFileName, makeBackup } from './backupFile';

// Save a backup copy: every record on this device, with its letters and
// photos, in one file the person keeps somewhere safe.

type State = { step: 'start' } | { step: 'making' } | { step: 'ready'; file: File } | { step: 'failed' };

export function BackupSection() {
  const { store } = useStore();
  const [state, setState] = useState<State>({ step: 'start' });
  const [dismissed, setDismissed] = useState(false);
  const last = useLiveQuery(() => store.lastBackupAt(), 'lastBackupAt');

  async function make() {
    setState({ step: 'making' });
    setDismissed(false);
    try {
      const createdAt = new Date().toISOString();
      const blob = await makeBackup(store, createdAt);
      setState({ step: 'ready', file: new File([blob], backupFileName(createdAt), { type: 'application/zip' }) });
    } catch {
      setState({ step: 'failed' });
    }
  }

  return (
    <section aria-labelledby="backup-save">
      <h2 id="backup-save">Save a backup copy</h2>
      <p>
        A backup is one file holding every record on this device, with all its letters and photos. Keep it somewhere
        safe, such as your email or a cloud drive, so you can bring your record back if this phone is lost or its data is
        cleared.
      </p>
      <div className="notice notice-info">
        <p className="notice-title">Keep the backup private</p>
        <p>
          It holds everything, including entries marked “Keep this private”, and it isn’t locked with a password. Anyone
          who has the file can read it.
        </p>
      </div>
      <p>{last ? `Last backup saved from this device: ${readableDate(last.slice(0, 10))}.` : 'No backup has been saved from this device yet.'}</p>
      <div className="button-row">
        <Button variant={state.step === 'ready' ? 'secondary' : 'primary'} onPress={() => void make()} isDisabled={state.step === 'making'}>
          {state.step === 'making' ? 'Making the backup…' : state.step === 'failed' ? 'Try making the backup again' : 'Make a backup'}
        </Button>
      </div>
      {state.step === 'ready' && (
        <DeliverFile
          file={state.file}
          name="backup"
          title="Say It Once backup"
          onSent={() => {
            store.noteBackupSaved().catch(() => undefined);
          }}
        />
      )}
      <p role="status" className="save-status-quiet">
        {state.step === 'making' ? 'Making the backup…' : state.step === 'ready' ? 'Your backup is ready.' : ''}
      </p>
      <div role="alert">
        {state.step === 'failed' && !dismissed && (
          <div className="notice notice-error">
            <p className="notice-title">No backup made</p>
            <p>The backup couldn’t be made. Your record hasn’t changed. Please try again.</p>
            <Button variant="secondary" onPress={() => setDismissed(true)}>
              Dismiss this message
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
