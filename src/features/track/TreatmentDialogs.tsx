import { useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextArea, TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import type { Item, MedicationData, TreatmentData } from '../../domain/types';
import { effects, medicationStatuses } from '../../domain/vocab';
import { useEntryForm } from '../../forms/useEntryForm';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';

const effectOptions = effects.map((e) => ({ value: e, label: e }));

function DeleteEntry({ id, what, onDone }: { id: string; what: string; onDone: () => void }) {
  const { store } = useStore();
  return (
    <ConfirmDialog
      trigger={<Button variant="danger">Delete</Button>}
      title={`Delete this ${what}?`}
      confirmLabel={`Delete ${what}`}
      pendingLabel="Deleting…"
      onConfirm={async () => {
        await store.deleteItem(id);
        onDone();
      }}
    >
      <p>It will be deleted from this device.</p>
    </ConfirmDialog>
  );
}

export function TreatmentDialog({
  edit,
  onClose,
}: {
  edit: { existing?: Item<'treatment'>; prefill?: Partial<TreatmentData> } | null;
  onClose: () => void;
}) {
  return (
    <EntryDialog
      isOpen={edit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={edit?.existing ? 'Edit treatment' : 'Add a treatment'}
      unsavedLabel="this treatment"
    >
      {(controls) => edit && <TreatmentForm edit={edit} controls={controls} />}
    </EntryDialog>
  );
}

function TreatmentForm({
  edit,
  controls,
}: {
  edit: { existing?: Item<'treatment'>; prefill?: Partial<TreatmentData> };
  controls: EntryFormControls;
}) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => edit.existing?.id ?? newItemId());
  const form = useEntryForm(
    edit.existing?.data ?? blank('treatment', edit.prefill ?? {}),
    edit.existing?.private ?? false,
    controls.onDirtyChange,
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!recordId) return;
        void form
          .submit(() => store.save('treatment', recordId, form.data, { id, private: form.isPrivate }))
          .then((ok) => ok && controls.done());
      }}
    >
      <TextField label="What was the treatment?" hint="For example, physiotherapy, an injection or an operation." isRequired {...form.text('name')} />
      <TextField label="Date (optional)" type="date" {...form.text('date')} />
      <details className="more">
        <summary>How it went (optional)</summary>
        <RadioList label="Did it help?" options={effectOptions} value={form.data.effect || null} onChange={(v) => form.set('effect', v)} />
        <TextArea label="Note" {...form.text('note')} />
      </details>
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        {edit.existing && <DeleteEntry id={edit.existing.id} what="treatment" onDone={controls.done} />}
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save treatment
        </Button>
      </div>
    </form>
  );
}

export function MedicationDialog({ edit, onClose }: { edit: { existing?: Item<'medication'> } | null; onClose: () => void }) {
  return (
    <EntryDialog
      isOpen={edit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={edit?.existing ? 'Edit medication' : 'Add a medication'}
      unsavedLabel="this medication"
    >
      {(controls) => edit && <MedicationForm existing={edit.existing} controls={controls} />}
    </EntryDialog>
  );
}

function MedicationForm({ existing, controls }: { existing: Item<'medication'> | undefined; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => existing?.id ?? newItemId());
  const form = useEntryForm<MedicationData>(existing?.data ?? blank('medication'), existing?.private ?? false, controls.onDirtyChange);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!recordId) return;
        void form
          .submit(() => store.save('medication', recordId, form.data, { id, private: form.isPrivate }))
          .then((ok) => ok && controls.done());
      }}
    >
      <TextField label="Name of the medication" isRequired {...form.text('name')} />
      <TextField label="What it’s for (optional)" {...form.text('forWhat')} />
      <details className="more">
        <summary>More detail (optional)</summary>
        <RadioList
          label="Are you still taking it?"
          options={medicationStatuses.map((s) => ({ value: s, label: s }))}
          value={form.data.status || null}
          onChange={(v) => form.set('status', v)}
        />
        <TextField label="Dose" hint="For example, 500 mg." {...form.text('dose')} />
        <TextField label="How often" hint="For example, twice a day." {...form.text('often')} />
        <TextField label="Started" type="date" {...form.text('started')} />
        <RadioList label="Has it helped?" options={effectOptions} value={form.data.effect || null} onChange={(v) => form.set('effect', v)} />
        <TextArea label="Side effects" {...form.text('sideEffects')} />
      </details>
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        {existing && <DeleteEntry id={existing.id} what="medication" onDone={controls.done} />}
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save medication
        </Button>
      </div>
    </form>
  );
}
