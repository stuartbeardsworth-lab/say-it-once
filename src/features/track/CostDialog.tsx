import { useId, useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import { formatPence, parsePounds } from '../../domain/money';
import type { CostData, Item } from '../../domain/types';
import { useEntryForm } from '../../forms/useEntryForm';
import { useItems } from '../../store/hooks';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';
import { SharedCopiesNote } from '../deliver/SharedCopiesNote';

// Money spent, or income lost, because of the injury or illness.

export type CostEdit = { existing?: Item<'cost'>; kind?: CostData['kind'] };

export function CostDialog({ edit, onClose }: { edit: CostEdit | null; onClose: () => void }) {
  const kind = edit?.existing?.data.kind ?? edit?.kind ?? 'expense';
  return (
    <EntryDialog
      isOpen={edit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={edit?.existing ? 'Edit this entry' : kind === 'income' ? 'Add income lost' : 'Add money spent'}
      unsavedLabel="this entry"
    >
      {(controls) => edit && <CostForm edit={edit} controls={controls} />}
    </EntryDialog>
  );
}

function CostForm({ edit, controls }: { edit: CostEdit; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const documents = useItems('document');
  const selectId = useId();
  const [id] = useState(() => edit.existing?.id ?? newItemId());
  const form = useEntryForm(
    edit.existing?.data ?? blank('cost', { kind: edit.kind ?? 'expense' }),
    edit.existing?.private ?? false,
    controls.onDirtyChange,
  );
  const [amountText, setAmountText] = useState(
    edit.existing?.data.amountPence != null ? formatPence(edit.existing.data.amountPence).slice(1) : '',
  );
  const income = form.data.kind === 'income';

  async function save() {
    if (!recordId) return;
    const amountPence = amountText.trim() === '' ? null : parsePounds(amountText);
    if (amountText.trim() !== '' && amountPence === null) {
      form.setErrors({ ...form.errors, amountPence: 'Enter an amount in pounds and pence, such as 12.50.' });
      return;
    }
    const data: CostData = { ...form.data, amountPence, dateTo: income ? form.data.dateTo : '' };
    const ok = await form.submit(() => store.save('cost', recordId, data, { id, private: form.isPrivate }));
    if (ok) controls.done();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {!edit.existing && (
        <RadioList
          label="Is this money spent or income lost?"
          options={[
            { value: 'expense', label: 'Money I spent' },
            { value: 'income', label: 'Income I lost' },
          ]}
          value={form.data.kind}
          onChange={(v) => form.set('kind', v)}
        />
      )}
      <TextField
        label={income ? 'What income was lost?' : 'What was it for?'}
        hint={income ? 'For example, wages, overtime or a missed shift.' : 'For example, taxi to hospital, prescription or a wrist brace.'}
        isRequired
        {...form.text('item')}
      />
      <div className="field-row">
        <TextField label={income ? 'From' : 'Date'} type="date" isRequired {...form.text('date')} />
        {income && <TextField label="To (optional)" type="date" {...form.text('dateTo')} />}
      </div>
      <TextField
        label="Amount in pounds (optional)"
        hint="For example, 12.50"
        inputMode="decimal"
        value={amountText}
        onChange={(v) => {
          setAmountText(v);
          if (form.errors.amountPence) form.setErrors({ ...form.errors, amountPence: '' });
        }}
        errorMessage={form.errors.amountPence || undefined}
      />
      <TextField
        label="Proof (optional)"
        hint="For example, “receipt in the kitchen drawer” or “on my bank statement”."
        {...form.text('evidence')}
      />
      {(documents ?? []).length > 0 && (
        <div className="field">
          <label className="field-label" htmlFor={selectId}>
            Link a document (optional)
          </label>
          <select
            id={selectId}
            className="field-input"
            value={form.data.documentId ?? ''}
            onChange={(e) => form.set('documentId', e.target.value || null)}
          >
            <option value="">No document</option>
            {(documents ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.data.title || d.data.file?.name || 'Untitled document'}
              </option>
            ))}
          </select>
        </div>
      )}
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        {edit.existing && (
          <ConfirmDialog
            trigger={<Button variant="danger">Delete</Button>}
            title="Delete this entry?"
            confirmLabel="Delete entry"
            pendingLabel="Deleting…"
            onConfirm={async () => {
              if (edit.existing) await store.deleteItem(edit.existing.id);
              controls.done();
            }}
          >
            <p>It will be deleted from this device.</p>
            <SharedCopiesNote itemIds={[edit.existing?.id]} />
          </ConfirmDialog>
        )}
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
