import { useState } from 'react';
import type { Item } from '../../domain/types';
import { FileNoteDialog } from './FileNoteDialog';
import { QuickNoteDialog } from './QuickNoteDialog';

// The write, edit and file dialogs, wired together so "Save and file it
// now" leads straight on to filing. Any screen that shows Quick Notes uses it.

export function useQuickNoteDialogs() {
  const [writing, setWriting] = useState<{ note?: Item<'quickNote'> } | null>(null);
  const [filing, setFiling] = useState<Item<'quickNote'> | null>(null);
  const [message, setMessage] = useState('');

  const dialogs = (
    <>
      <QuickNoteDialog
        isOpen={writing !== null}
        onOpenChange={(open) => {
          if (!open) setWriting(null);
        }}
        {...(writing?.note && { note: writing.note })}
        onSaved={(saved, fileNow) => {
          setWriting(null);
          setMessage('Quick Note saved.');
          if (fileNow) setFiling(saved);
        }}
      />
      <p role="status" className="quiet-status">
        {message}
      </p>
      <FileNoteDialog
        note={filing}
        onOpenChange={(open) => {
          if (!open) setFiling(null);
        }}
      />
    </>
  );

  return {
    dialogs,
    write: () => {
      setMessage('');
      setWriting({});
    },
    edit: (note: Item<'quickNote'>) => {
      setMessage('');
      setWriting({ note });
    },
    file: (note: Item<'quickNote'>) => setFiling(note),
  };
}
