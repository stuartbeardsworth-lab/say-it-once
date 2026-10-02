import { useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextArea } from '../../components/TextField';
import { blank } from '../../domain/blank';
import { today } from '../../domain/dates';
import type { Item } from '../../domain/types';
import { difficulties, howOften, impactAreaLabel, type ImpactAreaKey } from '../../domain/vocab';
import { useEntryForm } from '../../forms/useEntryForm';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';

// Add or edit one area of life (docs/spec.md, "Impact area"). Editing an
// existing area first asks what kind of edit it is: a real change keeps a
// snapshot of how things were; a correction replaces the words (Q9).

export type AreaEdit = { areaKey: ImpactAreaKey; existing?: Item<'impactArea'>; asChange?: boolean };

type EditKind = 'change' | 'correction';

const kindOptions: { value: EditKind; label: string }[] = [
  { value: 'change', label: 'Something has changed. Keep a record of how it was before.' },
  { value: 'correction', label: 'I’m correcting what I wrote. Replace it.' },
];

export function AreaDialog({ edit, onClose }: { edit: AreaEdit | null; onClose: () => void }) {
  return (
    <EntryDialog
      isOpen={edit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={edit ? impactAreaLabel(edit.areaKey) : ''}
      unsavedLabel="your changes"
    >
      {(controls) => edit && <AreaForm edit={edit} controls={controls} />}
    </EntryDialog>
  );
}

function AreaForm({ edit, controls }: { edit: AreaEdit; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => edit.existing?.id ?? newItemId());
  const [kind, setKind] = useState<EditKind | null>(edit.asChange ? 'change' : null);
  const [kindError, setKindError] = useState<string>();
  const form = useEntryForm(
    edit.existing?.data ?? blank('impactArea', { areaKey: edit.areaKey }),
    edit.existing?.private ?? false,
    controls.onDirtyChange,
  );

  async function save() {
    if (!recordId) return;
    if (edit.existing && !kind) {
      setKindError('Choose whether something has changed or you’re correcting it.');
      return;
    }
    const ok = await form.submit(() =>
      edit.existing && kind === 'change'
        ? store.recordChange(recordId, { type: 'impactArea', id, data: form.data, private: form.isPrivate }, today())
        : store.save('impactArea', recordId, form.data, { id, private: form.isPrivate }),
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
      {edit.existing && !edit.asChange && (
        <RadioList
          label="What kind of change is this?"
          options={kindOptions}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setKindError(undefined);
          }}
          errorMessage={kindError}
        />
      )}
      <RadioList
        label="How is this now?"
        options={difficulties.map((d) => ({ value: d, label: d }))}
        value={form.data.difficulty || null}
        onChange={(v) => form.set('difficulty', v)}
      />
      <TextArea
        label="Tell us what happens"
        hint="A few words are enough."
        {...form.text('detail')}
        rows={4}
        micHelp
      />
      <details className="more">
        <summary>More detail (optional)</summary>
        <TextArea label="Help I need" {...form.text('help')} />
        <TextArea label="Aids or equipment I use" {...form.text('aid')} />
        <RadioList
          label="How often"
          options={howOften.map((o) => ({ value: o, label: o }))}
          value={form.data.often || null}
          onChange={(v) => form.set('often', v)}
        />
        <TextArea label="Doing it safely, and more than once" {...form.text('safety')} />
        <TextArea label="The time it takes" {...form.text('timeLonger')} />
        <TextArea label="Doing it properly, to a good standard" {...form.text('standard')} />
      </details>
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
