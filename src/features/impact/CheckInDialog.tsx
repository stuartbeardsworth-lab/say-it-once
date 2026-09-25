import { useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextArea, TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import { today } from '../../domain/dates';
import type { Item } from '../../domain/types';
import { feelings, painLevels } from '../../domain/vocab';
import { useEntryForm } from '../../forms/useEntryForm';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';

// A dated health and wellbeing check-in: pain, how I feel, pulse, a note.
// The app records these; it never scores or interprets them.

export function CheckInDialog({
  isOpen,
  existing,
  onClose,
}: {
  isOpen: boolean;
  existing?: Item<'checkIn'> | undefined;
  onClose: () => void;
}) {
  return (
    <EntryDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={existing ? 'Edit check-in' : 'Health and wellbeing check-in'}
      unsavedLabel="this check-in"
    >
      {(controls) => <CheckInForm existing={existing} controls={controls} />}
    </EntryDialog>
  );
}

function CheckInForm({ existing, controls }: { existing: Item<'checkIn'> | undefined; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => existing?.id ?? newItemId());
  const form = useEntryForm(existing?.data ?? blank('checkIn', { date: today() }), existing?.private ?? false, controls.onDirtyChange);
  const [pulseText, setPulseText] = useState(existing?.data.pulse?.toString() ?? '');

  async function save() {
    if (!recordId) return;
    const trimmed = pulseText.trim();
    const pulse = trimmed === '' ? null : Number(trimmed);
    if (pulse !== null && Number.isNaN(pulse)) {
      form.setErrors({ ...form.errors, pulse: 'Pulse must be a whole number between 20 and 250.' });
      return;
    }
    const ok = await form.submit(() =>
      store.save('checkIn', recordId, { ...form.data, pulse }, { id, private: form.isPrivate }),
    );
    if (ok) controls.done();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <TextField label="Date" type="date" {...form.text('date')} />
      <RadioList
        label="Pain"
        options={painLevels.map((p) => ({ value: p, label: p }))}
        value={form.data.pain || null}
        onChange={(v) => form.set('pain', v)}
        errorMessage={form.errors.pain}
      />
      <RadioList
        label="How I feel"
        options={feelings.map((f) => ({ value: f, label: f }))}
        value={form.data.feeling || null}
        onChange={(v) => form.set('feeling', v)}
      />
      <details className="more">
        <summary>Pulse (optional)</summary>
        <TextField
          label="Pulse, in beats per minute"
          inputMode="numeric"
          value={pulseText}
          onChange={setPulseText}
          errorMessage={form.errors.pulse}
        />
      </details>
      <TextArea label="Note (optional)" {...form.text('note')} rows={3} />
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        {existing && (
          <ConfirmDialog
            trigger={<Button variant="danger">Delete</Button>}
            title="Delete this check-in?"
            confirmLabel="Delete check-in"
            pendingLabel="Deleting…"
            onConfirm={async () => {
              await store.deleteItem(existing.id);
              controls.done();
            }}
          >
            <p>The check-in will be deleted from this device.</p>
          </ConfirmDialog>
        )}
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save check-in
        </Button>
      </div>
    </form>
  );
}
