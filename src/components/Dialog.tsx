import type { ReactElement, ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

// Every dialog in the app is built from this one. React Aria provides the
// behaviour the old app's trapModal got right, plus what it got wrong:
// focus moves into the dialog, Tab and Shift+Tab stay inside it, Escape
// closes it, focus goes back to the button that opened it, and the dialog
// is named by its heading.

export interface DialogProps {
  /** The button that opens the dialog. */
  trigger: ReactElement;
  /** Shown as the dialog's heading and used as its accessible name. */
  title: string;
  /** Content, or a function that receives `close` for Done/Cancel buttons. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Use 'alertdialog' when the dialog asks the person to confirm something. */
  role?: 'dialog' | 'alertdialog';
  onOpenChange?: (isOpen: boolean) => void;
}

export function Dialog({ trigger, title, children, role = 'dialog', onOpenChange }: DialogProps) {
  return (
    <DialogTrigger {...(onOpenChange && { onOpenChange })}>
      {trigger}
      <ModalOverlay className="dialog-overlay" isDismissable={role === 'dialog'}>
        <Modal className="dialog-modal">
          <AriaDialog className="dialog" role={role}>
            {({ close }) => (
              <>
                <Heading slot="title" className="dialog-title">
                  {title}
                </Heading>
                {typeof children === 'function' ? children(close) : children}
              </>
            )}
          </AriaDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
