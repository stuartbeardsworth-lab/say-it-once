import { useState, type ReactElement, type ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';
import { Button } from './Button';

// Every dialog in the app is built from this one. React Aria provides the
// behaviour the old app's trapModal got right, plus what it got wrong:
// focus moves into the dialog, Tab and Shift+Tab stay inside it, Escape
// closes it, focus goes back to where it was, and the dialog is named by
// its heading.
//
// When the dialog holds words that haven't been saved (`hasUnsavedChanges`),
// closing it with Escape, a tap outside or a Cancel button asks first
// instead of throwing the words away (fixes D11 in docs/spec.md).

export interface DialogActions {
  /** Close, asking first if there are unsaved changes. For Cancel buttons. */
  close: () => void;
  /** Close without asking. For after a successful save. */
  finish: () => void;
}

export interface DialogProps {
  /** The button that opens the dialog. Leave out to control it with isOpen. */
  trigger?: ReactElement;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Shown as the dialog's heading and used as its accessible name. */
  title: string;
  /** Content, or a function that receives close and finish. */
  children: ReactNode | ((close: () => void, actions: DialogActions) => ReactNode);
  /** Use 'alertdialog' when the dialog asks the person to confirm something. */
  role?: 'dialog' | 'alertdialog';
  hasUnsavedChanges?: boolean;
  /** What "Discard" throws away, e.g. "this note". */
  unsavedLabel?: string;
}

export function Dialog({
  trigger,
  isOpen,
  onOpenChange,
  title,
  children,
  role = 'dialog',
  hasUnsavedChanges = false,
  unsavedLabel = 'your changes',
}: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [askingToDiscard, setAskingToDiscard] = useState(false);
  const open = isOpen ?? internalOpen;

  function setOpen(next: boolean) {
    setAskingToDiscard(false);
    if (isOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function requestOpenChange(next: boolean) {
    if (!next && hasUnsavedChanges) {
      setAskingToDiscard(true);
      return;
    }
    setOpen(next);
  }

  const actions: DialogActions = {
    close: () => requestOpenChange(false),
    finish: () => setOpen(false),
  };

  const overlay = (
    <ModalOverlay
      className="dialog-overlay"
      isDismissable={role === 'dialog'}
      isOpen={open}
      onOpenChange={requestOpenChange}
    >
      <Modal className="dialog-modal">
        <AriaDialog className="dialog" role={role}>
          <Heading slot="title" className="dialog-title">
            {title}
          </Heading>
          {typeof children === 'function' ? children(actions.close, actions) : children}
          {askingToDiscard && (
            <div role="alert" className="notice notice-error discard-prompt">
              <p className="notice-title">This hasn’t been saved</p>
              <p>If you close now, {unsavedLabel} will be lost.</p>
              <div className="button-row">
                <Button variant="primary" onPress={() => setAskingToDiscard(false)} autoFocus>
                  Keep editing
                </Button>
                <Button variant="secondary" onPress={actions.finish}>
                  Discard {unsavedLabel}
                </Button>
              </div>
            </div>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );

  if (!trigger) return overlay;
  return (
    <DialogTrigger isOpen={open} onOpenChange={requestOpenChange}>
      {trigger}
      {overlay}
    </DialogTrigger>
  );
}

/**
 * Moves focus to `target` once every dialog has left the page. For when the
 * button that opened a dialog is gone by the time it closes (a filed note
 * leaving Home). Focus moved while a dialog is still on the page would be
 * pulled back into it, and React Aria restores focus a frame after the
 * dialog goes, so this waits for both.
 */
export function focusWhenDialogsClose(target: () => HTMLElement | null, maxFrames = 120): void {
  let frames = 0;
  requestAnimationFrame(function check() {
    if (document.querySelector('.dialog-overlay') && ++frames < maxFrames) {
      requestAnimationFrame(check);
      return;
    }
    requestAnimationFrame(() => target()?.focus());
  });
}
