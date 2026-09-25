import type { SectionKey } from '../../domain/vocab';
import { RouteLink } from '../../router';
import { useItems } from '../../store/hooks';
import { QuickNoteCard } from './QuickNoteCard';
import { useQuickNoteDialogs } from './useQuickNoteDialogs';

/** "Quick Notes filed here", shown at the end of a section's screen. */
export function FiledNotes({ section }: { section: SectionKey }) {
  const notes = useItems('quickNote');
  const { dialogs, edit, file } = useQuickNoteDialogs();
  const filed = (notes ?? []).filter((n) => n.data.filedTo?.section === section).reverse();
  if (filed.length === 0) return null;
  return (
    <section aria-labelledby={`filed-${section}`}>
      <h2 id={`filed-${section}`}>Quick Notes filed here</h2>
      <div className="note-list">
        {filed.map((n) => (
          <QuickNoteCard key={n.id} note={n} onEdit={edit} onFile={file} />
        ))}
      </div>
      <p>
        <RouteLink to="quick-notes">See all Quick Notes</RouteLink>
      </p>
      {dialogs}
    </section>
  );
}
