import { useState } from 'react';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { RadioList } from '../../components/RadioList';
import { TextField } from '../../components/TextField';
import { readableDate } from '../../domain/format';
import { useStore } from '../../store/StoreContext';
import { useLiveQuery } from '../../store/useLiveQuery';
import { DeliverFile } from '../deliver/DeliverFile';
import { backupFileName, makeBackup } from './backupFile';
import { lock, lockedBackupFileName, passwordProblem, suggestPassword } from './lock';

// Save a backup copy: every record on this device, with its letters and
// photos, in one file the person keeps somewhere safe. It can be locked
// with a password (decided 27 September 2026), so it's safe to keep in
// email or a cloud drive, where it survives losing the phone.

type State =
  | { step: 'start' }
  | { step: 'making' }
  | { step: 'ready'; file: File; locked: boolean }
  | { step: 'failed' };

type LockChoice = 'lock' | 'plain';

export function BackupSection() {
  const { store } = useStore();
  const [state, setState] = useState<State>({ step: 'start' });
  const [dismissed, setDismissed] = useState(false);
  const [choice, setChoice] = useState<LockChoice>('lock');
  const [password, setPassword] = useState('');
  const [writtenDown, setWrittenDown] = useState(false);
  const [tried, setTried] = useState(false);
  const last = useLiveQuery(() => store.lastBackupAt(), 'lastBackupAt');

  const locking = choice === 'lock';
  const problem = locking ? passwordProblem(password) : null;
  const notWrittenDown = locking && !writtenDown;

  async function make() {
    setTried(true);
    if (problem || notWrittenDown) return;
    setState({ step: 'making' });
    setDismissed(false);
    try {
      const createdAt = new Date().toISOString();
      const zip = await makeBackup(store, createdAt);
      const file = locking
        ? new File([await lock(zip, password, createdAt)], lockedBackupFileName(createdAt), { type: 'application/octet-stream' })
        : new File([zip], backupFileName(createdAt), { type: 'application/zip' });
      setState({ step: 'ready', file, locked: locking });
    } catch {
      setState({ step: 'failed' });
    }
  }

  return (
    <section aria-labelledby="backup-save">
      <h2 id="backup-save">Save a backup copy</h2>
      <p>
        A backup is one file holding every record on this device, with all its letters and photos. Keep it somewhere
        safe, so you can bring your record back if this phone is lost or its data is cleared.
      </p>
      <p>{last ? `Last backup saved from this device: ${readableDate(last.slice(0, 10))}.` : 'No backup has been saved from this device yet.'}</p>

      <RadioList<LockChoice>
        label="Lock it with a password?"
        hint="We recommend locking it. A backup holds everything, including entries marked “Keep this private”. Locked, only someone with the password can open it, so it’s safe to keep in your email or a cloud drive. Not locked, anyone who has the file can read it."
        options={[
          { value: 'lock', label: 'Yes, lock it' },
          { value: 'plain', label: 'No, don’t lock it' },
        ]}
        value={choice}
        onChange={(v) => {
          setChoice(v);
          setTried(false);
        }}
      />

      {locking && (
        <>
          <TextField
            label="Password for this backup"
            hint="At least 12 characters. Four ordinary words are easy to remember and hard to guess."
            value={password}
            onChange={setPassword}
            autoComplete="off"
            spellCheck="false"
            errorMessage={tried && problem ? problem : undefined}
          />
          <div className="button-row">
            <Button
              onPress={() =>
                void suggestPassword().then(
                  (p) => setPassword(p),
                  () => undefined,
                )
              }
            >
              Suggest a password
            </Button>
          </div>
          <div className="notice notice-info">
            <p className="notice-title">If you forget the password, the backup can’t be opened</p>
            <p>Nobody can reset it, not even Say It Once. Write it down and keep it somewhere safe, apart from the backup.</p>
          </div>
          <Checkbox
            label="I’ve written the password down"
            hint="On paper, or in a password manager. Not in the same place as the backup."
            isSelected={writtenDown}
            onChange={setWrittenDown}
          />
          {tried && notWrittenDown && (
            <p className="field-error" role="alert">
              Please write the password down first, then tick the box.
            </p>
          )}
        </>
      )}

      <div className="button-row">
        <Button variant={state.step === 'ready' ? 'secondary' : 'primary'} onPress={() => void make()} isDisabled={state.step === 'making'}>
          {state.step === 'making'
            ? locking
              ? 'Making and locking the backup…'
              : 'Making the backup…'
            : state.step === 'failed'
              ? 'Try making the backup again'
              : 'Make a backup'}
        </Button>
      </div>
      {state.step === 'ready' && (
        // Shown at the moment of choosing where the file goes.
        <div className="notice notice-info">
          <p className="notice-title">Where to keep it</p>
          {state.locked ? (
            <ul>
              <li>Because it’s locked, you can keep it in your own email, Google Drive or iCloud, where it’s safe if you lose this phone.</li>
              <li>Keep the password somewhere else.</li>
            </ul>
          ) : (
            <ul>
              <li>Somewhere only you can open: your own email, or your own Google Drive or iCloud.</li>
              <li>Not a shared family account, a group chat or a work email.</li>
            </ul>
          )}
        </div>
      )}
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
        {state.step === 'making'
          ? locking
            ? 'Making and locking the backup…'
            : 'Making the backup…'
          : state.step === 'ready'
            ? state.locked
              ? 'Your locked backup is ready.'
              : 'Your backup is ready.'
            : ''}
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
