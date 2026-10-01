import { useState } from 'react';
import { Button } from '../../components/Button';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { anyFilled, MoreDetail } from '../../components/MoreDetail';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import type { Item } from '../../domain/types';
import { yesNoNotSure } from '../../domain/vocab';
import { useEntryForm } from '../../forms/useEntryForm';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';

// Work at the time of the accident (docs/spec.md, "IIDB work details").

export function WorkDetailsDialog({
  isOpen,
  existing,
  onClose,
}: {
  isOpen: boolean;
  existing: Item<'workDetails'> | undefined;
  onClose: () => void;
}) {
  return (
    <EntryDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Work at the time"
      unsavedLabel="your work details"
    >
      {(controls) => <WorkForm existing={existing} controls={controls} />}
    </EntryDialog>
  );
}

function WorkForm({ existing, controls }: { existing: Item<'workDetails'> | undefined; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => existing?.id ?? newItemId());
  const form = useEntryForm(existing?.data ?? blank('workDetails'), false, controls.onDirtyChange);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!recordId) return;
        void form.submit(() => store.save('workDetails', recordId, form.data, { id })).then((ok) => ok && controls.done());
      }}
    >
      <p>Used for an Industrial Injuries Disablement Benefit claim. Fill in what you know.</p>
      <TextField label="Employer" {...form.text('employer')} />
      <TextField label="Your job" {...form.text('jobTitle')} />
      <TextField label="Where you worked" {...form.text('workplace')} />
      <MoreDetail
        hasContent={anyFilled(
          existing?.data.employmentStart,
          existing?.data.employmentEnd,
          existing?.data.payrollRef,
          existing?.data.accidentReported,
          existing?.data.reportedTo,
          existing?.data.reportDate,
          existing?.data.employmentSince,
        )}
      >
        <div className="field-row">
          <TextField label="Started working there" type="date" {...form.text('employmentStart')} />
          <TextField label="Left (if you have)" type="date" {...form.text('employmentEnd')} />
        </div>
        <TextField label="Payroll or staff number" {...form.text('payrollRef')} />
        <RadioList
          label="Did you report the accident at work?"
          options={yesNoNotSure.map((v) => ({ value: v, label: v }))}
          value={form.data.accidentReported || null}
          onChange={(v) => form.set('accidentReported', v)}
        />
        <TextField label="Who you reported it to" {...form.text('reportedTo')} />
        <div className="field-row">
          <TextField label="Date reported" type="date" {...form.text('reportDate')} />
          <TextField label="Back at work since" type="date" {...form.text('employmentSince')} />
        </div>
      </MoreDetail>
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save work details
        </Button>
      </div>
    </form>
  );
}
