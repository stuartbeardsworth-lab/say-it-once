import { useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';

// A dialog holding one entry's form. The form is mounted fresh each time the
// dialog opens, reports whether anything has changed, and the dialog asks
// before throwing changes away.

export interface EntryFormControls {
  onDirtyChange: (dirty: boolean) => void;
  /** Cancel: asks first if anything changed. */
  cancel: () => void;
  /** After a successful save or delete. */
  done: () => void;
}

interface EntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  unsavedLabel: string;
  /** After a successful save (or a delete, when editing). Home uses it to
   *  say where a new entry went, since its list isn't on screen. */
  onDone?: () => void;
  children: (controls: EntryFormControls) => ReactNode;
}

export function EntryDialog({ isOpen, onOpenChange, title, unsavedLabel, onDone, children }: EntryDialogProps) {
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
      unsavedLabel={unsavedLabel}
    >
      {(close, { finish }) =>
        children({
          onDirtyChange: setDirty,
          cancel: close,
          done: () => {
            setDirty(false);
            finish();
            onDone?.();
          },
        })
      }
    </Dialog>
  );
}
