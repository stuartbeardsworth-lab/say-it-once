import { useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextArea } from '../../components/TextField';
import { today } from '../../domain/dates';
import type { Item } from '../../domain/types';
import { useEntryForm } from '../../forms/useEntryForm';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';

// "Anything else this has changed": free text, with the same change or
// correction choice as an area.

export function NoteDialog({
  isOpen,
  existing,
  asChange,
  onClose,
}: {
  isOpen: boolean;
  existing: Item<'impactNote'> | undefined;
  asChange: boolean;
  onClose: () => void;
}) {
  return (
    <EntryDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Anything else this has changed"
      unsavedLabel="your changes"
    >
      {(controls) => <NoteForm existing={existing} asChange={asChange} controls={controls} />}
    </EntryDialog>
  );
}

function NoteForm({
  existing,
  asChange,
  controls,
}: {
  existing: Item<'impactNote'> | undefined;
  asChange: boolean;
  controls: EntryFormControls;
}) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => existing?.id ?? newItemId());
  const hasText = (existing?.data.text ?? '').trim() !== '';
  const [kind, setKind] = useState<'change' | 'correction' | null>(asChange || !hasText ? 'correction' : null);
  const [kindError, setKindError] = useState<string>();
  const form = useEntryForm(existing?.data ?? { text: '' }, existing?.private ?? false, controls.onDirtyChange);

  async function save() {
    if (!recordId) return;
    if (!kind) {
      setKindError('Choose whether something has changed or you’re correcting it.');
      return;
    }
    const ok = await form.submit(() =>
      hasText && (asChange || kind === 'change')
        ? store.recordChange(recordId, { type: 'impactNote', id, data: form.data, private: form.isPrivate }, today())
        : store.save('impactNote', recordId, form.data, { id, private: form.isPrivate }),
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
      {hasText && !asChange && (
        <RadioList
          label="What kind of change is this?"
          options={[
            { value: 'change', label: 'Something has changed. Keep a record of how it was before.' },
            { value: 'correction', label: 'I’m correcting what I wrote. Replace it.' },
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setKindError(undefined);
          }}
          errorMessage={kindError}
        />
      )}
      <TextArea
        label="In your own words"
        hint="For example, work, hobbies, family life or sleep. A few words are enough."
        {...form.text('text')}
        rows={5}
      />
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
