import { useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { SaveStatus } from '../../components/SaveStatus';
import { TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import type { Item } from '../../domain/types';
import { useEntryForm } from '../../forms/useEntryForm';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';

export function ContactDialog({ edit, onClose }: { edit: { existing?: Item<'contact'> } | null; onClose: () => void }) {
  return (
    <EntryDialog
      isOpen={edit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={edit?.existing ? 'Edit contact' : 'Add a contact'}
      unsavedLabel="this contact"
    >
      {(controls) => edit && <ContactForm existing={edit.existing} controls={controls} />}
    </EntryDialog>
  );
}

function ContactForm({ existing, controls }: { existing: Item<'contact'> | undefined; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => existing?.id ?? newItemId());
  const form = useEntryForm(existing?.data ?? blank('contact'), existing?.private ?? false, controls.onDirtyChange);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!recordId) return;
        void form
          .submit(() => store.save('contact', recordId, form.data, { id, private: form.isPrivate }))
          .then((ok) => ok && controls.done());
      }}
    >
      <TextField label="Name or organisation" hint="For example, a solicitor, your GP surgery or a helpline." {...form.text('organisation')} />
      <TextField label="Phone number or email" type="text" inputMode="email" {...form.text('phoneOrEmail')} />
      <TextField label="Their role (optional)" hint="For example, case handler or physiotherapist." {...form.text('role')} />
      <TextField label="Reference number (optional)" hint="Your claim, case or patient number with them." {...form.text('reference')} />
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        {existing && (
          <ConfirmDialog
            trigger={<Button variant="danger">Delete</Button>}
            title="Delete this contact?"
            confirmLabel="Delete contact"
            pendingLabel="Deleting…"
            onConfirm={async () => {
              await store.deleteItem(existing.id);
              controls.done();
            }}
          >
            <p>It will be deleted from this device.</p>
          </ConfirmDialog>
        )}
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save contact
        </Button>
      </div>
    </form>
  );
}
