import { useState } from 'react';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TextField } from '../components/TextField';
import { today } from '../domain/dates';
import { appointmentCalendar, safeFileName } from '../domain/exports';
import { readableDate } from '../domain/format';
import type { Item } from '../domain/types';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { AppointmentDialog } from '../features/track/AppointmentDialog';
import { FileLink } from '../features/track/FileLink';
import { deliverFile, deliveryMessage } from '../forms/deliverFile';
import { PageTop } from '../shell/PageTop';
import { useItems, useRecordName } from '../store/hooks';
import { useStore } from '../store/StoreContext';
import { SharedCopiesNote } from '../features/deliver/SharedCopiesNote';

// Appointments (docs/spec.md, "diary"): upcoming ones first, earlier ones
// folded away with a search.

function byDateTime(a: Item<'appointment'>, b: Item<'appointment'>) {
  return `${a.data.date}${a.data.time}`.localeCompare(`${b.data.date}${b.data.time}`);
}

export function Appointments() {
  const appointments = useItems('appointment');
  const documents = useItems('document');
  const [editing, setEditing] = useState<{ existing?: Item<'appointment'> } | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const now = today();

  const upcoming = (appointments ?? []).filter((a) => a.data.date >= now).sort(byDateTime);
  const earlier = (appointments ?? [])
    .filter((a) => a.data.date < now)
    .sort((a, b) => byDateTime(b, a))
    .filter((a) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const { organisation, person, purpose, told, next, location } = a.data;
      return [organisation, person, purpose, told, next, location].some((s) => s.toLowerCase().includes(q));
    });

  const card = (a: Item<'appointment'>, isUpcoming: boolean) => (
    <AppointmentCard
      key={a.id}
      appt={a}
      letter={documents?.find((d) => d.id === a.data.documentId)}
      isUpcoming={isUpcoming}
      onEdit={() => {
        setMessage('');
        setEditing({ existing: a });
      }}
      onMessage={setMessage}
    />
  );

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Appointments</h1>
      <Button
        variant="primary"
        onPress={() => {
          setMessage('');
          setEditing({});
        }}
      >
        Add an appointment
      </Button>
      <p role="status" className="quiet-status">
        {message}
      </p>

      <h2>Coming up</h2>
      {appointments === undefined ? (
        <p>Loading…</p>
      ) : upcoming.length === 0 ? (
        <p>No upcoming appointments.</p>
      ) : (
        <ul className="entry-list">{upcoming.map((a) => card(a, true))}</ul>
      )}

      <details className="more">
        <summary>Earlier appointments ({(appointments ?? []).filter((a) => a.data.date < now).length})</summary>
        <TextField label="Search earlier appointments" type="search" value={search} onChange={setSearch} />
        {earlier.length === 0 ? (
          <p>{search ? 'Nothing matches that search.' : 'No earlier appointments.'}</p>
        ) : (
          <ul className="entry-list">{earlier.map((a) => card(a, false))}</ul>
        )}
      </details>

      <FiledNotes section="appointments" />

      <AppointmentDialog
        isOpen={editing !== null}
        existing={editing?.existing}
        onClose={() => setEditing(null)}
        onSaved={setMessage}
      />
    </>
  );
}

function AppointmentCard({
  appt,
  letter,
  isUpcoming,
  onEdit,
  onMessage,
}: {
  appt: Item<'appointment'>;
  letter: Item<'document'> | undefined;
  isUpcoming: boolean;
  onEdit: () => void;
  onMessage: (message: string) => void;
}) {
  const { store } = useStore();
  const recordName = useRecordName() ?? 'My record';
  const [alsoLetter, setAlsoLetter] = useState(false);
  const d = appt.data;

  async function addToCalendar() {
    const name = safeFileName(`${d.organisation} ${d.date}`, 'ics');
    const result = await deliverFile(appointmentCalendar(appt.id, d, recordName), name, 'text/calendar');
    onMessage(deliveryMessage(result, name, 'Open it to add the appointment to your calendar.'));
  }

  return (
    <li className="note-card">
      <h3 className="entry-title">
        {readableDate(d.date)}
        {d.time && `, ${d.time}`} — {d.organisation}
      </h3>
      <p className="entry-meta">{[d.purpose, d.type, d.person && `Seeing ${d.person}`, d.location].filter(Boolean).join(' · ')}</p>
      {d.told && (
        <p className="note-text">
          <strong>What I was told:</strong> {d.told}
        </p>
      )}
      {d.next && (
        <p className="note-text">
          <strong>What happens next:</strong> {d.next}
        </p>
      )}
      {appt.private && <p className="field-hint">Private</p>}
      {letter?.data.file && (
        <p>
          <FileLink fileId={letter.data.file.fileId}>View the letter</FileLink>
        </p>
      )}
      <div className="button-row">
        <Button onPress={onEdit}>Edit</Button>
        {isUpcoming && !appt.private && <Button onPress={() => void addToCalendar()}>Add to my calendar</Button>}
        <ConfirmDialog
          trigger={<Button variant="danger">Delete</Button>}
          title="Delete this appointment?"
          confirmLabel="Delete appointment"
          pendingLabel="Deleting…"
          onConfirm={async () => {
            await store.deleteItem(appt.id, { alsoDeleteLetter: alsoLetter });
            onMessage('Appointment deleted.');
          }}
        >
          <p>
            The appointment on {readableDate(d.date)} with {d.organisation} will be deleted from this device.
          </p>
          {letter && (
            <Checkbox
              label="Also delete the letter saved with it"
              hint="Leave this unticked to keep the letter in Letters & documents. A letter can matter as evidence later."
              isSelected={alsoLetter}
              onChange={setAlsoLetter}
            />
          )}
          <SharedCopiesNote itemIds={[appt.id, alsoLetter ? letter?.id : null]} />
        </ConfirmDialog>
      </div>
      {isUpcoming && appt.private && (
        <p className="field-hint">Private appointments can’t be added to your calendar.</p>
      )}
    </li>
  );
}
