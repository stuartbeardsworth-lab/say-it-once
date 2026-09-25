import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

// Used for every delete. Focus starts on Cancel, so pressing Enter by
// accident never deletes anything. If the action fails, the dialog stays
// open and says so, rather than closing as if it had worked.

export interface ConfirmDialogProps {
  trigger: ReactElement;
  title: string;
  /** What will happen, in plain words. */
  children: ReactNode;
  /** For example "Delete this appointment". Say what the button does. */
  confirmLabel: string;
  /** Shown on the confirm button while the action runs, e.g. "Deleting…". */
  pendingLabel?: string;
  cancelLabel?: string;
  /** Runs when the person confirms. Throw to report a failure. */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  children,
  confirmLabel,
  pendingLabel = 'Working…',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <Dialog
      trigger={trigger}
      title={title}
      role="alertdialog"
      onOpenChange={(isOpen) => {
        if (isOpen) setFailed(false);
      }}
    >
      {(close) => {
        async function confirm() {
          setPending(true);
          setFailed(false);
          try {
            await onConfirm();
            close();
          } catch {
            setFailed(true);
          } finally {
            setPending(false);
          }
        }
        return (
          <>
            <div className="dialog-body">{children}</div>
            {failed && (
              <p role="alert" className="notice notice-error">
                That didn&rsquo;t work, so nothing has changed. Please try again.
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="secondary" onPress={close} autoFocus>
                {cancelLabel}
              </Button>
              <Button variant="danger" onPress={() => void confirm()} isPending={pending}>
                {pending ? pendingLabel : confirmLabel}
              </Button>
            </div>
          </>
        );
      }}
    </Dialog>
  );
}
