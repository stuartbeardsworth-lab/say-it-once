import { useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { RadioList } from '../../components/RadioList';
import { SaveStatus, type SaveState } from '../../components/SaveStatus';
import type { ImpactAreaKey, SectionKey } from '../../domain/vocab';
import { impactAreas, sectionLabels, sections } from '../../domain/vocab';
import type { Item } from '../../domain/types';
import { messageFor } from '../../forms/useAutosave';
import { useStore } from '../../store/StoreContext';

// "File this quick note" (docs/spec.md): choose a section, and for How it
// affects me optionally one of the 12 areas.

type AreaChoice = ImpactAreaKey | 'other' | 'not-sure';

const sectionOptions = sections.map((s) => ({ value: s, label: sectionLabels[s] }));
const areaOptions: { value: AreaChoice; label: string }[] = [
  ...impactAreas.map((a) => ({ value: a.key, label: a.label })),
  { value: 'other', label: 'Something else' },
  { value: 'not-sure', label: 'Not sure' },
];

interface FileNoteDialogProps {
  note: Item<'quickNote'> | null;
  onOpenChange: (isOpen: boolean) => void;
  /** Called after the note is filed (or unfiled) and the dialog has closed. */
  onFiled?: (filedTo: Item<'quickNote'>['data']['filedTo']) => void;
}

export function FileNoteDialog({ note, onOpenChange, onFiled }: FileNoteDialogProps) {
  return (
    <Dialog isOpen={note !== null} onOpenChange={onOpenChange} title="File this Quick Note">
      {(close, { finish }) =>
        note && (
          <FileNoteForm
            note={note}
            onCancel={close}
            onDone={(filedTo) => {
              finish();
              onFiled?.(filedTo);
            }}
          />
        )
      }
    </Dialog>
  );
}

function FileNoteForm({
  note,
  onCancel,
  onDone,
}: {
  note: Item<'quickNote'>;
  onCancel: () => void;
  onDone: (filedTo: Item<'quickNote'>['data']['filedTo']) => void;
}) {
  const { store } = useStore();
  const current = note.data.filedTo;
  const [section, setSection] = useState<SectionKey | null>(current?.section ?? null);
  const [area, setArea] = useState<AreaChoice>(current?.impactArea ?? 'not-sure');
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<SaveState>({ kind: 'idle' });
  const hasPhoto = note.data.photoFileId !== null;

  async function file(filedTo: Item<'quickNote'>['data']['filedTo']) {
    setStatus({ kind: 'saving' });
    try {
      await store.fileQuickNote(note.id, filedTo);
      onDone(filedTo);
    } catch (e) {
      setStatus({ kind: 'failed', message: messageFor(e) });
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!section) {
          setError('Choose where to file this note.');
          return;
        }
        void file({ section, impactArea: section === 'impact' && area !== 'not-sure' ? area : null });
      }}
    >
      <p className="dialog-quote">
        “{note.data.text.slice(0, 120) || 'Photo'}
        {note.data.text.length > 120 ? '…' : ''}”
      </p>
      <RadioList
        label="Where should it go?"
        options={sectionOptions}
        value={section}
        onChange={(v) => {
          setSection(v);
          setError(undefined);
        }}
        errorMessage={error}
        hint={
          hasPhoto ? 'Filing it in Letters & documents or Appointments also keeps the photo as a document.' : undefined
        }
      />
      {section === 'impact' && (
        <RadioList label="Which area of life? (optional)" options={areaOptions} value={area} onChange={setArea} />
      )}
      <SaveStatus status={status} onDismiss={() => setStatus({ kind: 'idle' })} />
      <div className="dialog-actions">
        <Button onPress={onCancel}>Cancel</Button>
        {current && <Button onPress={() => void file(null)}>Remove from {sectionLabels[current.section]}</Button>}
        <Button variant="primary" type="submit" isDisabled={status.kind === 'saving'}>
          File note
        </Button>
      </div>
    </form>
  );
}
