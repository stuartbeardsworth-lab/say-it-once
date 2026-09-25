import { useState } from 'react';
import { Button } from '../../components/Button';
import { Checkbox, KeepPrivate } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EntryDialog, type EntryFormControls } from '../../components/EntryDialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus } from '../../components/SaveStatus';
import { TextArea, TextField } from '../../components/TextField';
import { blank } from '../../domain/blank';
import { today } from '../../domain/dates';
import { readableDate } from '../../domain/format';
import type { Item } from '../../domain/types';
import { sectionLabels, sections, type SectionKey } from '../../domain/vocab';
import { useEntryForm } from '../../forms/useEntryForm';
import { StorageProblem } from '../../store/problems';
import { newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';
import { FilePicker } from './FilePicker';

// A letter or document: a photo, a PDF, or just the details of a paper one
// (docs/spec.md, "Document"). It needs a file or a name.

const relatesOptions: { value: SectionKey | 'none'; label: string }[] = [
  { value: 'none', label: 'Nothing in particular' },
  ...sections.filter((s) => s !== 'documents').map((s) => ({ value: s, label: sectionLabels[s] })),
];

export function DocumentDialog({ edit, onClose }: { edit: { existing?: Item<'document'> } | null; onClose: () => void }) {
  return (
    <EntryDialog
      isOpen={edit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={edit?.existing ? 'Edit document details' : 'Add a letter or document'}
      unsavedLabel="this document"
    >
      {(controls) => edit && <DocumentForm existing={edit.existing} controls={controls} />}
    </EntryDialog>
  );
}

function DocumentForm({ existing, controls }: { existing: Item<'document'> | undefined; controls: EntryFormControls }) {
  const { store } = useStore();
  const recordId = useRecordId();
  const [id] = useState(() => existing?.id ?? newItemId());
  const [file, setFile] = useState<{ file: File; fromCamera: boolean } | null>(null);
  const form = useEntryForm(existing?.data ?? blank('document'), existing?.private ?? false, controls.onDirtyChange);
  const tooLarge = () => void form.submit(() => Promise.reject(new StorageProblem('too-large')));
  const attached = file?.file.name ?? form.data.file?.name ?? null;

  async function save() {
    if (!recordId) return;
    let title = form.data.title;
    if (!title.trim() && file) title = file.fromCamera ? `Photo document — ${readableDate(today())}` : file.file.name;
    const ok = await form.submit(() =>
      store.saveDocument(
        recordId,
        id,
        { ...form.data, title },
        form.isPrivate,
        file ? { blob: file.file, name: file.file.name || 'photo.jpg' } : undefined,
      ),
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
      <FilePicker
        label="The document"
        buttonLabel="Choose a file"
        hint="A PDF or photo, up to 25 MB. You can also just write down the details of a paper copy."
        accept="application/pdf,image/jpeg,image/png,image/webp,image/*"
        current={attached}
        onPick={(f) => setFile({ file: f, fromCamera: false })}
        onTooLarge={tooLarge}
      />
      {!attached && (
        <FilePicker
          label="Or take a photo of it"
          buttonLabel="Take a photo"
          hint="Opens the camera on a phone."
          accept="image/*"
          capture
          current={null}
          onPick={(f) => setFile({ file: f, fromCamera: true })}
          onTooLarge={tooLarge}
        />
      )}
      <TextField
        label="Name"
        hint="For example, “Letter from the fracture clinic”. Needed if there’s no file."
        {...form.text('title')}
      />
      <details className="more">
        <summary>More details (optional)</summary>
        <div className="field-row">
          <TextField label="Date on it" type="date" {...form.text('date')} />
          <TextField label="Reply or act by" type="date" {...form.text('actBy')} />
        </div>
        <TextField label="Who it’s from" {...form.text('from')} />
        <RadioList
          label="What it relates to"
          options={relatesOptions}
          value={form.data.relatedTo?.section ?? 'none'}
          onChange={(v) => form.set('relatedTo', v === 'none' ? null : { section: v, itemId: null })}
        />
        <TextArea label="The important point" hint="In your own words." {...form.text('point')} />
        <TextArea label="Important wording" hint="Copy any words that matter exactly as written." {...form.text('wording')} />
        <TextField label="Where the paper copy is" hint="For example, “blue folder, kitchen drawer”." {...form.text('paperCopy')} />
        <Checkbox label="Done, or no action needed" isSelected={form.data.done} onChange={(v) => form.set('done', v)} />
      </details>
      <KeepPrivate isSelected={form.isPrivate} onChange={form.setPrivate} />
      <SaveStatus status={form.status} onDismiss={form.dismissStatus} />
      <div className="dialog-actions">
        {existing && (
          <ConfirmDialog
            trigger={<Button variant="danger">Delete</Button>}
            title="Delete this document?"
            confirmLabel="Delete document"
            pendingLabel="Deleting…"
            onConfirm={async () => {
              await store.deleteItem(existing.id);
              controls.done();
            }}
          >
            <p>The document and its file will be deleted from this device.</p>
            <p>Appointments and costs it was linked to keep their details, but lose the link.</p>
          </ConfirmDialog>
        )}
        <Button onPress={controls.cancel}>Cancel</Button>
        <Button variant="primary" type="submit" isDisabled={form.saving}>
          Save document
        </Button>
      </div>
    </form>
  );
}
