import { Button } from '../components/Button';
import { QuickNoteCard } from '../features/quickNotes/QuickNoteCard';
import { useQuickNoteDialogs } from '../features/quickNotes/useQuickNoteDialogs';
import { PageTop } from '../shell/PageTop';
import { useItems } from '../store/hooks';

export function QuickNotes() {
  const notes = useItems('quickNote');
  const { dialogs, write, edit, file } = useQuickNoteDialogs();
  const newestFirst = [...(notes ?? [])].reverse();
  const unfiled = newestFirst.filter((n) => n.data.filedTo === null).length;

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Quick Notes</h1>
      <p>Jot something down now and file it later, or leave it here. It still counts.</p>
      <Button variant="primary" onPress={write}>
        Write a Quick Note
      </Button>
      {notes === undefined ? (
        <p>Loading…</p>
      ) : newestFirst.length === 0 ? (
        <p>No Quick Notes yet.</p>
      ) : (
        <>
          {unfiled > 0 && (
            <p>
              {unfiled === 1 ? '1 note hasn’t' : `${unfiled} notes haven’t`} been filed yet. There’s no rush.
            </p>
          )}
          <div className="note-list">
            {newestFirst.map((n) => (
              <QuickNoteCard key={n.id} note={n} onEdit={edit} onFile={file} />
            ))}
          </div>
        </>
      )}
      {dialogs}
    </>
  );
}
