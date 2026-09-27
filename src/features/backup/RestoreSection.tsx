import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { RadioList } from '../../components/RadioList';
import { TextField } from '../../components/TextField';
import { CryptoProblem } from '../../crypto/problems';
import { readableDate } from '../../domain/format';
import { RouteLink } from '../../router';
import { useStore } from '../../store/StoreContext';
import { checkBackup, type CheckedBackup } from './backupFile';
import { isLockedBackup, lockedBackupCreatedAt, unlock } from './lock';

// Restore from a backup. The file is checked first and what it holds is
// shown, problems included, before anything changes. Restoring only ever
// adds records; a record already on this device is skipped unless the
// person chooses to add it as a separate copy.

type Choice = 'skip' | 'copy';
type Checked = Extract<CheckedBackup, { ok: true }>;

type State =
  | { step: 'start' }
  | { step: 'checking' }
  | { step: 'locked'; file: File; createdAt: string; unlocking: boolean; error: string | null }
  | { step: 'checked'; backup: Checked; choices: Choice[] }
  | { step: 'restoring'; backup: Checked; choices: Choice[] }
  | { step: 'done'; names: string[] }
  | { step: 'failed'; reason: string };

export function RestoreSection() {
  const { store } = useStore();
  const inputId = useId();
  const [state, setState] = useState<State>({ step: 'start' });
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move to what the backup holds, and to the result, as each appears.
  useEffect(() => {
    if (state.step === 'checked' || state.step === 'done' || state.step === 'locked') headingRef.current?.focus();
  }, [state.step]);

  async function check(file: File) {
    setState({ step: 'checking' });
    try {
      if (await isLockedBackup(file)) {
        const createdAt = await lockedBackupCreatedAt(file);
        setState({ step: 'locked', file, createdAt, unlocking: false, error: null });
        return;
      }
      await checkUnlocked(file);
    } catch (error) {
      setState({ step: 'failed', reason: unlockFailure(error) });
    }
  }

  async function unlockAndCheck(file: File, createdAt: string, password: string) {
    setState({ step: 'locked', file, createdAt, unlocking: true, error: null });
    let zip: Blob;
    try {
      zip = await unlock(file, password);
    } catch (error) {
      if (error instanceof CryptoProblem && error.kind === 'wrong-passphrase') {
        setState({
          step: 'locked',
          file,
          createdAt,
          unlocking: false,
          error: 'That password doesn’t open this backup. Check for typing mistakes, spaces and capital letters, then try again.',
        });
      } else {
        setState({ step: 'failed', reason: unlockFailure(error) });
      }
      return;
    }
    setState({ step: 'checking' });
    await checkUnlocked(zip);
  }

  async function checkUnlocked(file: Blob) {
    try {
      const backup = await checkBackup(file, store);
      if (!backup.ok) setState({ step: 'failed', reason: backup.reason });
      else setState({ step: 'checked', backup, choices: backup.records.map(() => 'skip') });
    } catch {
      setState({ step: 'failed', reason: 'The backup couldn’t be opened. Nothing has been changed.' });
    }
  }

  async function restore(backup: Checked, choices: Choice[]) {
    setState({ step: 'restoring', backup, choices });
    const chosen = backup.records.filter((r, i) => !r.alreadyHere || choices[i] === 'copy');
    try {
      await store.restoreRecords(
        chosen.map((r) => (r.alreadyHere ? { ...r.restore, nameSuffix: ' (restored copy)' } : r.restore)),
        backup.personName,
      );
      setState({ step: 'done', names: chosen.map((r) => (r.alreadyHere ? `${r.name} (restored copy)` : r.name)) });
    } catch {
      setState({ step: 'failed', reason: 'Nothing was restored, and nothing on this device has changed. Please try again.' });
    }
  }

  const showing = state.step === 'checked' || state.step === 'restoring' ? state : null;
  const count = showing ? showing.backup.records.filter((r, i) => !r.alreadyHere || showing.choices[i] === 'copy').length : 0;

  return (
    <section aria-labelledby="backup-restore">
      <h2 id="backup-restore">Restore from a backup</h2>
      <p>
        Choose a backup file saved from Say It Once. You’ll see what it holds before anything changes. Restoring adds
        its records to this device; it never replaces or changes what’s already here.
      </p>

      {!showing && state.step !== 'locked' && (
        <div className="button-row">
          <label htmlFor={inputId} className="button button-secondary file-button">
            {state.step === 'checking' ? 'Opening the backup…' : 'Choose a backup file'}
          </label>
          <input
            id={inputId}
            type="file"
            className="visually-hidden-input"
            disabled={state.step === 'checking'}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void check(file);
            }}
          />
        </div>
      )}

      {state.step === 'locked' && <UnlockForm state={state} headingRef={headingRef} onUnlock={(p) => void unlockAndCheck(state.file, state.createdAt, p)} onCancel={() => setState({ step: 'start' })} />}

      {showing && (
        <div className="note-card">
          <h3 ref={headingRef} tabIndex={-1}>
            In this backup, saved {readableDate(showing.backup.createdAt.slice(0, 10))}
          </h3>
          <ul className="entry-list">
            {showing.backup.records.map((r, i) => (
              <li key={r.restore.meta.id}>
                <p>
                  <strong>{r.name}</strong>: {r.entries} {r.entries === 1 ? 'entry' : 'entries'}, {r.files}{' '}
                  {r.files === 1 ? 'file' : 'files'}
                </p>
                {r.problems.length > 0 && (
                  <div className="notice notice-info">
                    <p>Some of this record can’t be brought back:</p>
                    <ul>
                      {r.problems.map((p, n) => (
                        <li key={n}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.alreadyHere && (
                  <RadioList
                    label={`“${r.alreadyHere}” is already on this device`}
                    options={[
                      { value: 'skip', label: 'Leave it out' },
                      { value: 'copy', label: 'Restore it as a separate copy' },
                    ]}
                    value={showing.choices[i] ?? 'skip'}
                    onChange={(v) =>
                      state.step === 'checked' &&
                      setState({ ...state, choices: state.choices.map((c, n) => (n === i ? v : c)) })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
          <div className="button-row">
            <Button
              variant="primary"
              isDisabled={count === 0 || state.step === 'restoring'}
              onPress={() => void restore(showing.backup, showing.choices)}
            >
              {state.step === 'restoring'
                ? 'Restoring…'
                : count === 0
                  ? 'Nothing to restore'
                  : `Restore ${count === 1 ? '1 record' : `${count} records`}`}
            </Button>
            <Button onPress={() => setState({ step: 'start' })} isDisabled={state.step === 'restoring'}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {state.step === 'done' && (
        <div className="notice">
          <h3 ref={headingRef} tabIndex={-1} className="notice-title">
            Restored
          </h3>
          <p>
            {state.names.map((n) => `“${n}”`).join(', ')} {state.names.length === 1 ? 'is' : 'are'} now on this device.
            Open {state.names.length === 1 ? 'it' : 'them'} from <RouteLink to="records">My records</RouteLink>.
          </p>
        </div>
      )}

      <div role="alert">
        {state.step === 'failed' && (
          <div className="notice notice-error">
            <p className="notice-title">Not restored</p>
            <p>{state.reason}</p>
            <Button variant="secondary" onPress={() => setState({ step: 'start' })}>
              Dismiss this message
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function unlockFailure(error: unknown): string {
  if (error instanceof CryptoProblem && error.kind === 'newer-format') {
    return 'This backup was made by a newer version of Say It Once. Update the app, then try again. Nothing has been changed.';
  }
  return 'This backup has been damaged, so it can’t be opened. Nothing has been changed.';
}

function UnlockForm({
  state,
  headingRef,
  onUnlock,
  onCancel,
}: {
  state: { createdAt: string; unlocking: boolean; error: string | null };
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onUnlock: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  return (
    <form
      className="note-card"
      onSubmit={(e) => {
        e.preventDefault();
        if (password && !state.unlocking) onUnlock(password);
      }}
    >
      <h3 ref={headingRef} tabIndex={-1}>
        This backup is locked
      </h3>
      <p>Saved {readableDate(state.createdAt.slice(0, 10))}. Type the password chosen when it was made.</p>
      <TextField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="off"
        spellCheck="false"
        errorMessage={state.error ?? undefined}
      />
      <div className="button-row">
        <Button type="submit" variant="primary" isDisabled={!password || state.unlocking}>
          {state.unlocking ? 'Unlocking…' : 'Unlock'}
        </Button>
        <Button onPress={onCancel} isDisabled={state.unlocking}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
