import { useEffect, useId, useState } from 'react';
import { Button } from '../../components/Button';
import { KeepPrivate } from '../../components/Checkbox';
import { Dialog } from '../../components/Dialog';
import { SaveStatus, type SaveState } from '../../components/SaveStatus';
import { TextArea } from '../../components/TextField';
import { blank } from '../../domain/blank';
import type { Item } from '../../domain/types';
import { messageFor } from '../../forms/useAutosave';
import { StorageProblem, ValidationProblem } from '../../store/problems';
import { maxFileBytes, newItemId } from '../../store/store';
import { useRecordId, useStore } from '../../store/StoreContext';
import { useFileUrl } from '../../store/useFileUrl';

// Write a Quick Note, optionally with a photo, and save it unfiled or go
// straight on to filing it (docs/spec.md, "Quick Note").

interface QuickNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** The note to edit. Leave out to write a new one. */
  note?: Item<'quickNote'>;
  /** Called after a successful save. `fileNow` when the person chose "File this now". */
  onSaved?: (note: Item<'quickNote'>, fileNow: boolean) => void;
}

export function QuickNoteDialog({ isOpen, onOpenChange, note, onSaved }: QuickNoteDialogProps) {
  const [dirty, setDirty] = useState(false);
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setDirty(false);
        onOpenChange(open);
      }}
      title={note ? 'Edit Quick Note' : 'Quick Note'}
      hasUnsavedChanges={dirty}
      unsavedLabel="this note"
    >
      {(close, { finish }) => (
        <QuickNoteForm
          note={note}
          onDirtyChange={setDirty}
          onCancel={close}
          onSaved={(saved, fileNow) => {
            finish();
            onSaved?.(saved, fileNow);
          }}
        />
      )}
    </Dialog>
  );
}

interface FormProps {
  note: Item<'quickNote'> | undefined;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onSaved: (note: Item<'quickNote'>, fileNow: boolean) => void;
}

function QuickNoteForm({ note, onDirtyChange, onCancel, onSaved }: FormProps) {
  const { store } = useStore();
  const recordId = useRecordId();
  const photoInputId = useId();
  const [text, setText] = useState(note?.data.text ?? '');
  const [isPrivate, setIsPrivate] = useState(note?.private ?? false);
  const [keptPhotoId, setKeptPhotoId] = useState(note?.data.photoFileId ?? null);
  const [newPhoto, setNewPhoto] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<SaveState>({ kind: 'idle' });

  const keptPhotoUrl = useFileUrl(keptPhotoId);
  // Free the preview's memory when the photo is replaced or the form closes.
  useEffect(() => {
    return () => {
      if (newPhoto) URL.revokeObjectURL(newPhoto.url);
    };
  }, [newPhoto]);
  const photoUrl = newPhoto ? newPhoto.url : keptPhotoUrl;
  const hasPhoto = newPhoto !== null || keptPhotoId !== null;

  const changed =
    text !== (note?.data.text ?? '') ||
    isPrivate !== (note?.private ?? false) ||
    newPhoto !== null ||
    keptPhotoId !== (note?.data.photoFileId ?? null);

  useEffect(() => {
    onDirtyChange(changed);
  }, [changed, onDirtyChange]);

  async function save(fileNow: boolean) {
    setError(undefined);
    if (!recordId) {
      setStatus({ kind: 'failed', message: new StorageProblem('unavailable').message });
      return;
    }
    if (text.trim() === '' && !hasPhoto) {
      setError('Write a few words, or add a photo.');
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      const photo = newPhoto ? await store.saveFile(recordId, newPhoto.file, newPhoto.file.name || 'photo.jpg') : null;
      const saved = await store.save(
        'quickNote',
        recordId,
        blank('quickNote', {
          text,
          filedTo: note?.data.filedTo ?? null,
          photoFileId: photo?.fileId ?? keptPhotoId,
        }),
        { id: note?.id ?? newItemId(), private: isPrivate },
      );
      setStatus({ kind: 'saved' });
      onSaved(saved, fileNow);
    } catch (e) {
      if (e instanceof ValidationProblem) {
        setStatus({ kind: 'idle' });
        setError(Object.values(e.errors)[0]);
      } else {
        setStatus({ kind: 'failed', message: messageFor(e) });
      }
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <TextArea
        label="Your note"
        hint="A few words are enough. To speak instead of typing, use the microphone on your phone’s keyboard."
        value={text}
        onChange={setText}
        errorMessage={error}
        rows={4}
        autoFocus
      />

      <div className="field">
        <span className="field-label">Photo (optional)</span>
        {hasPhoto ? (
          <>
            {photoUrl && <img src={photoUrl} alt="The photo saved with this note" className="photo-preview" />}
            <Button
              onPress={() => {
                setNewPhoto(null);
                setKeptPhotoId(null);
              }}
            >
              Remove photo
            </Button>
          </>
        ) : (
          <>
            <label htmlFor={photoInputId} className="button button-secondary file-button">
              Add a photo
            </label>
            <input
              id={photoInputId}
              type="file"
              accept="image/*"
              className="visually-hidden-input"
              aria-describedby={`${photoInputId}-hint`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (file.size > maxFileBytes) {
                  setStatus({ kind: 'failed', message: new StorageProblem('too-large').message });
                  return;
                }
                setNewPhoto({ file, url: URL.createObjectURL(file) });
              }}
            />
            <span id={`${photoInputId}-hint`} className="field-hint">
              Take a photo or choose one. Up to 25 MB.
            </span>
          </>
        )}
      </div>

      <KeepPrivate isSelected={isPrivate} onChange={setIsPrivate} />

      <SaveStatus status={status} onDismiss={() => setStatus({ kind: 'idle' })} />

      <div className="dialog-actions">
          <Button onPress={onCancel}>Cancel</Button>
          <Button onPress={() => void save(true)} isDisabled={status.kind === 'saving'}>
            {note?.data.filedTo ? 'Save and change where it’s filed' : 'Save and file it now'}
          </Button>
          <Button variant="primary" type="submit" isDisabled={status.kind === 'saving'}>
            {note ? 'Save changes' : 'Save as Quick Note'}
          </Button>
        </div>
    </form>
  );
}
