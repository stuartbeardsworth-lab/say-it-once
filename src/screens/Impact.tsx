import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog } from '../components/Dialog';
import { readableDate } from '../domain/format';
import type { Item } from '../domain/types';
import { impactAreaLabel, impactAreas } from '../domain/vocab';
import { AreaDialog, type AreaEdit } from '../features/impact/AreaDialog';
import { CheckInDialog } from '../features/impact/CheckInDialog';
import { NoteDialog } from '../features/impact/NoteDialog';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { RouteLink } from '../router';
import { PageTop } from '../shell/PageTop';
import { useItems } from '../store/hooks';
import { useStore } from '../store/StoreContext';
import { SharedCopiesNote } from '../features/deliver/SharedCopiesNote';

// How it affects me (docs/spec.md, "impact").

export function Impact() {
  const { store } = useStore();
  const areas = useItems('impactArea');
  const notes = useItems('impactNote');
  const checkIns = useItems('checkIn');
  const note = notes?.[0];
  const [picking, setPicking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [areaEdit, setAreaEdit] = useState<AreaEdit | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ asChange: boolean } | null>(null);
  const [checkIn, setCheckIn] = useState<{ existing?: Item<'checkIn'> } | null>(null);

  const filledKeys = new Set((areas ?? []).map((a) => a.data.areaKey));
  const ordered = impactAreas.flatMap((def) => (areas ?? []).filter((a) => a.data.areaKey === def.key));
  const hasPosition = ordered.length > 0 || (note?.data.text.trim() ?? '') !== '';
  const recentCheckIns = [...(checkIns ?? [])].sort((a, b) => b.data.date.localeCompare(a.data.date)).slice(0, 3);

  function openArea(key: (typeof impactAreas)[number]['key'], asChange = false) {
    const existing = (areas ?? []).find((a) => a.data.areaKey === key);
    setAreaEdit({ areaKey: key, ...(existing && { existing }), asChange });
  }

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>How it affects me</h1>
      <p>
        Everyday things that have changed since the injury or illness. Add only what matters to you; you can come back
        any time.
      </p>
      <div className="button-row">
        <Button variant="primary" onPress={() => setPicking(true)}>
          Choose an area that’s changed
        </Button>
        {hasPosition && <Button onPress={() => setChanging(true)}>Something has changed</Button>}
      </div>

      {ordered.length > 0 && (
        <section aria-labelledby="areas-heading">
          <h2 id="areas-heading">Areas you’ve described</h2>
          <ul className="entry-list">
            {ordered.map((a) => (
              <li key={a.id} className="note-card">
                <h3 className="entry-title">{impactAreaLabel(a.data.areaKey)}</h3>
                {a.data.difficulty && <p className="entry-meta">{a.data.difficulty}</p>}
                {a.data.detail && <p className="note-text">{a.data.detail}</p>}
                {a.private && <p className="field-hint">Private</p>}
                <div className="button-row">
                  <Button onPress={() => openArea(a.data.areaKey)}>Edit</Button>
                  <ConfirmDialog
                    trigger={<Button variant="danger">Delete</Button>}
                    title={`Delete ${impactAreaLabel(a.data.areaKey)}?`}
                    confirmLabel="Delete this area"
                    pendingLabel="Deleting…"
                    onConfirm={() => store.deleteItem(a.id)}
                  >
                    <p>This area will be deleted, including every earlier version of it kept in Changes over time.</p>
                    <SharedCopiesNote itemIds={[a.id]} />
                  </ConfirmDialog>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="note-heading">
        <h2 id="note-heading">Anything else this has changed</h2>
        {note && note.data.text.trim() !== '' ? (
          <div className="note-card">
            <p className="note-text">{note.data.text}</p>
            {note.private && <p className="field-hint">Private</p>}
            <Button onPress={() => setNoteEdit({ asChange: false })}>Edit</Button>
          </div>
        ) : (
          <>
            <p>For example, work, hobbies, family life or sleep.</p>
            <Button onPress={() => setNoteEdit({ asChange: false })}>Describe it in your own words</Button>
          </>
        )}
      </section>

      <section aria-labelledby="checkin-heading">
        <h2 id="checkin-heading">Health and wellbeing</h2>
        <p>A quick check-in on pain and how you feel. Over time these show how things are going.</p>
        <Button onPress={() => setCheckIn({})}>Add a check-in</Button>
        {recentCheckIns.length > 0 && (
          <ul className="entry-list">
            {recentCheckIns.map((c) => (
              <li key={c.id} className="note-card">
                <p className="entry-title">{readableDate(c.data.date)}</p>
                <p className="entry-meta">
                  {[c.data.pain && `Pain: ${c.data.pain}`, c.data.feeling && `Feeling: ${c.data.feeling}`, c.data.pulse && `Pulse: ${c.data.pulse}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {c.data.note && <p className="note-text">{c.data.note}</p>}
                <Button onPress={() => setCheckIn({ existing: c })}>Edit</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p>
        <RouteLink to="changes">See changes over time</RouteLink>
      </p>

      <FiledNotes section="impact" />

      <Dialog isOpen={picking} onOpenChange={setPicking} title="Choose an area">
        {(close, { finish }) => (
          <>
            <p>Which part of everyday life has changed?</p>
            <div className="chooser chooser-list">
              {impactAreas.map((a) => (
                <Button
                  key={a.key}
                  onPress={() => {
                    finish();
                    openArea(a.key);
                  }}
                >
                  {a.label}
                  {filledKeys.has(a.key) ? ' (described)' : ''}
                </Button>
              ))}
            </div>
            <div className="dialog-actions">
              <Button onPress={close}>Cancel</Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog isOpen={changing} onOpenChange={setChanging} title="Something has changed">
        {(close, { finish }) => (
          <>
            <p>
              What has changed? Say It Once keeps a record of how things were, so you can show how they’ve changed over time.
            </p>
            <div className="chooser chooser-list">
              <Button
                onPress={() => {
                  finish();
                  setCheckIn({});
                }}
              >
                Physical or mental wellbeing
              </Button>
              {ordered.map((a) => (
                <Button
                  key={a.id}
                  onPress={() => {
                    finish();
                    openArea(a.data.areaKey, true);
                  }}
                >
                  {impactAreaLabel(a.data.areaKey)}
                </Button>
              ))}
              <Button
                onPress={() => {
                  finish();
                  setNoteEdit({ asChange: true });
                }}
              >
                Something else
              </Button>
            </div>
            <div className="dialog-actions">
              <Button onPress={close}>Cancel</Button>
            </div>
          </>
        )}
      </Dialog>

      <AreaDialog edit={areaEdit} onClose={() => setAreaEdit(null)} />
      <NoteDialog
        isOpen={noteEdit !== null}
        existing={note}
        asChange={noteEdit?.asChange ?? false}
        onClose={() => setNoteEdit(null)}
      />
      <CheckInDialog isOpen={checkIn !== null} existing={checkIn?.existing} onClose={() => setCheckIn(null)} />
    </>
  );
}
