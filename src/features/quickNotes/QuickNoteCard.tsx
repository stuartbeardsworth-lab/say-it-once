import { useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Dialog } from '../../components/Dialog';
import type { Item } from '../../domain/types';
import { useStore } from '../../store/StoreContext';
import { useFileUrl } from '../../store/useFileUrl';
import { whenSaved, whereFiled } from './format';

// One Quick Note in a list, with everything you can do to it.

interface QuickNoteCardProps {
  note: Item<'quickNote'>;
  onEdit: (note: Item<'quickNote'>) => void;
  onFile: (note: Item<'quickNote'>) => void;
  /** Leave out to hide Delete, for short summaries such as on Home. */
  showDelete?: boolean;
}

export function QuickNoteCard({ note, onEdit, onFile, showDelete = true }: QuickNoteCardProps) {
  const { store } = useStore();
  const photoUrl = useFileUrl(note.data.photoFileId);
  const [viewing, setViewing] = useState(false);
  const unfiled = note.data.filedTo === null;

  return (
    <article className="note-card" aria-label={`Quick Note from ${whenSaved(note.createdAt)}`}>
      {note.data.text && <p className="note-text">{note.data.text}</p>}
      {photoUrl && (
        <button type="button" className="thumb-button" onClick={() => setViewing(true)}>
          <img src={photoUrl} alt="Photo saved with this note. Open it larger" className="thumb" />
        </button>
      )}
      <p className="field-hint">
        {whenSaved(note.createdAt)} · {whereFiled(note.data.filedTo)}
        {note.private && ' · Private'}
      </p>
      <div className="button-row">
        <Button variant={unfiled ? 'primary' : 'secondary'} onPress={() => onFile(note)}>
          {unfiled ? 'File' : 'Change where it’s filed'}
        </Button>
        <Button onPress={() => onEdit(note)}>Edit</Button>
        {showDelete && (
          <ConfirmDialog
            trigger={<Button variant="danger">Delete</Button>}
            title="Delete this Quick Note?"
            confirmLabel="Delete note"
            pendingLabel="Deleting…"
            onConfirm={() => store.deleteItem(note.id)}
          >
            <p>The note will be deleted from this device.</p>
            {note.data.photoFileId && <p>Its photo will be deleted too, unless it has been kept as a document.</p>}
          </ConfirmDialog>
        )}
      </div>
      {photoUrl && (
        <Dialog isOpen={viewing} onOpenChange={setViewing} title="Photo">
          {(close) => (
            <>
              <img src={photoUrl} alt="Photo saved with this Quick Note" className="photo-large" />
              <div className="dialog-actions">
                <Button variant="primary" onPress={close}>
                  Close
                </Button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </article>
  );
}
