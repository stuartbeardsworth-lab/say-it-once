import { Button } from './Button';

// The quiet line under a form that says whether the person's words are safe.
// "Saving…" and "Saved" are announced politely. A failure is announced at
// once, explains what to do, and stays on screen until the person dismisses
// it: it never fades away like a toast.

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'failed'; message: string };

export interface SaveStatusProps {
  status: SaveState;
  /** Called when the person dismisses a failure message. */
  onDismiss: () => void;
}

export function SaveStatus({ status, onDismiss }: SaveStatusProps) {
  // Both live regions are always in the page, so screen readers are already
  // listening when the text inside them changes.
  return (
    <div className="save-status">
      <p role="status" className="save-status-quiet">
        {status.kind === 'saving' && 'Saving…'}
        {status.kind === 'saved' && 'Saved'}
      </p>
      <div role="alert">
        {status.kind === 'failed' && (
          <div className="notice notice-error">
            <p className="notice-title">Not saved</p>
            <p>{status.message}</p>
            <p>Your words are still here, so nothing has been lost from this screen.</p>
            <Button variant="secondary" onPress={onDismiss}>
              Dismiss this message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
