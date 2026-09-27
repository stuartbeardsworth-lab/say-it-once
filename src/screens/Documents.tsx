import { useState } from 'react';
import { Button } from '../components/Button';
import { today } from '../domain/dates';
import { readableDate } from '../domain/format';
import type { Item } from '../domain/types';
import { sectionLabels } from '../domain/vocab';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { DocumentDialog } from '../features/track/DocumentDialog';
import { FileLink } from '../features/track/FileLink';
import { PageTop } from '../shell/PageTop';
import { useItems } from '../store/hooks';

export function Documents() {
  const documents = useItems('document');
  const [edit, setEdit] = useState<{ existing?: Item<'document'> } | null>(null);
  const sorted = [...(documents ?? [])].sort((a, b) => (b.data.date || b.createdAt).localeCompare(a.data.date || a.createdAt));
  const now = today();

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Letters &amp; documents</h1>
      <p>Photos and PDFs of letters, reports and forms, or just the details of a paper copy.</p>
      <Button variant="primary" onPress={() => setEdit({})}>
        Add a letter or document
      </Button>
      {documents === undefined ? (
        <p>Loading…</p>
      ) : sorted.length === 0 ? (
        <p>No documents yet.</p>
      ) : (
        <ul className="entry-list">
          {sorted.map((d) => (
            <li key={d.id} className="note-card">
              <h2 className="entry-title">{d.data.title || d.data.file?.name || 'Untitled document'}</h2>
              <p className="entry-meta">
                {[
                  d.data.date && readableDate(d.data.date),
                  d.data.from && `From ${d.data.from}`,
                  d.data.relatedTo && `Relates to: ${sectionLabels[d.data.relatedTo.section]}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {d.data.actBy && !d.data.done && (
                <p className={d.data.actBy < now ? 'badge badge-due' : 'badge'}>
                  {d.data.actBy < now ? 'Was due by' : 'Reply or act by'} {readableDate(d.data.actBy)}
                </p>
              )}
              {d.data.point && <p className="note-text">{d.data.point}</p>}
              {d.data.paperCopy && <p className="entry-meta">Paper copy: {d.data.paperCopy}</p>}
              {d.private && <p className="field-hint">Private</p>}
              <div className="button-row">
                {d.data.file && <FileLink fileId={d.data.file.fileId}>View the document</FileLink>}
                <Button onPress={() => setEdit({ existing: d })}>Edit details</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FiledNotes section="documents" />
      <DocumentDialog edit={edit} onClose={() => setEdit(null)} />
    </>
  );
}
