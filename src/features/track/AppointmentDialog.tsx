import { useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextArea, TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import type { Item } from '../../domain/types';
import { appointmentTypes } from '../../domain/vocab';
import { useEntryForm } from '../../forms/useEntryForm';
import { StorageProblem } from '../../store/problems';
import { newItemId } from '../../store/store';
import { useItems } from '../../store/hooks';
import { useRecordId, useStore } from '../../store/StoreContext';
import { FilePicker } from './FilePicker';

// Add or edit an appointment (docs/spec.md, "Appointment"). Only the date
// and who it's with are needed.

export function AppointmentDialog({
  isOpen,
  existing,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  existing?: Item<'appointment'> | undefined;
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  return (
    <EntryDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={existing ? 'Edit appointment' : 'Add an appointment'}
      unsavedLabel="this appointment"
    >
      {(controls) => <AppointmentForm existing={existing} controls={controls} onSaved={onSaved} />}
    </EntryDialog>
  );
}

function AppointmentForm({
  existing,
  controls,
  onSaved,
}: {
  existing: Item<'appointment'> | undefined;
  controls: EntryFormControls;
  onSaved: ((message: string) => void) | undefined;
}) {
  const { store } = useStore();
  const recordId = useRecordId();
  const appointments = useItems('appointment');
  const contacts = useItems('contact');
  const documents = useItems('document');
  const [id] = useState(() => existing?.id ?? newItemId());
  const [letter, setLetter] = useState<File | null>(null);
  const form = useEntryForm(existing?.data ?? blank('appointment'), existing?.private ?? false, controls.onDirtyChange);
  const currentLetter = documents?.find((d) => d.id === form.data.documentId);

  const suggestions = [
    ...new Set(
      [...(appointments ?? []).map((a) => a.data.organisation), ...(contacts ?? []).map((c) => c.data.organisation)]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];

  async function save() {
    if (!recordId) return;
    const ok = await form.submit(() =>
      store.saveAppointment(
        recordId,
        id,
        form.data,
        form.isPrivate,
        letter ? { blob: letter, name: letter.name || 'letter' } : undefined,
      ),
    );
    if (ok) {
      onSaved?.('Appointment saved.');
      controls.done();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="field-row">
        <TextField label="Date" type="date" isRequired {...form.text('date')} />
        <TextField label="Time (optional)" type="time" {...form.text('time')} />
      </div>

      <LetterFields
        current={letter?.name ?? currentLetter?.data.file?.name ?? null}
        onPick={setLetter}
        onTooLarge={() => void form.submit(() => Promise.reject(new StorageProblem('too-large')))}
      />
      <TextField
        label="Who is it with?"
        hint="For example, the hospital, GP surgery or clinic."
        list="organisation-suggestions"
        isRequired
        {...form.text('organisation')}
      />
      <datalist id="organisation-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <TextField label="What is it for? (optional)" hint="For example, physiotherapy or a scan." {...form.text('purpose')} />


      <details className="more">
        <summary>More about the appointment</summary>
        <RadioList
          label="Type"
          options={appointmentTypes.map((t) => ({ value: t, label: t }))}
          value={form.data.type || null}
          onChange={(v) => form.set('type', v)}
        />
        <TextField label="Person you’re seeing" {...form.text('person')} />
        <TextField label="Where" hint="For example, the ward, room or address." {...form.text('location')} />
      </details>

      <details className="more">
        <summary>After the appointment</summary>
        <TextArea label="What I was told" {...form.text('told')} />
        <TextArea label="What happens next" {...form.text('next')} />
      </details>

      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save appointment
        </Button>
      </div>
    </form>
  );
}

// The letter comes near the top, since most appointments arrive as a letter
// and people copy the details from it. Taking a photo is offered first, as
// in Letters & documents; once there's a letter, only Replace is shown.
function LetterFields({
  current,
  onPick,
  onTooLarge,
}: {
  current: string | null;
  onPick: (file: File) => void;
  onTooLarge: () => void;
}) {
  return (
    <>
      {!current && (
        <FilePicker
          label="Appointment letter (optional)"
          buttonLabel="Take a photo of the letter"
          hint="Opens the camera on a phone."
          accept="image/*"
          capture
          current={null}
          onPick={onPick}
          onTooLarge={onTooLarge}
        />
      )}
      <FilePicker
        label={current ? 'Appointment letter' : 'Or choose a file'}
        hint="A photo or PDF of the letter, up to 25 MB. It’s also kept in Letters & documents."
        accept="application/pdf,image/jpeg,image/png,image/webp,image/*"
        current={current}
        onPick={onPick}
        onTooLarge={onTooLarge}
      />
    </>
  );
}
