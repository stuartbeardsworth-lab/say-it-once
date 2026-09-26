import { useState } from 'react';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { today } from '../domain/dates';
import { readableDate } from '../domain/format';
import { QuickNoteCard } from '../features/quickNotes/QuickNoteCard';
import { useQuickNoteDialogs } from '../features/quickNotes/useQuickNoteDialogs';
import { AppointmentDialog } from '../features/track/AppointmentDialog';
import { navigate, RouteLink, type Route } from '../router';
import { AddToPhonePrompt } from '../shell/AddToPhonePrompt';
import { DeviceOnlyBanner } from '../shell/DeviceOnlyBanner';
import { useItems } from '../store/hooks';

// The eight kinds of thing you can add (docs/spec.md, "Add something").
const addChoices: { label: string; to: Route | 'appointment' | 'quick-note' }[] = [
  { label: 'What happened', to: 'what' },
  { label: 'An appointment', to: 'appointment' },
  { label: 'Treatment or medication', to: 'treatment' },
  { label: 'Something has changed', to: 'impact' },
  { label: 'A letter or document', to: 'documents' },
  { label: 'A cost or lost income', to: 'costs' },
  { label: 'A contact', to: 'contacts' },
  { label: 'A Quick Note', to: 'quick-note' },
];

export function Home() {
  const notes = useItems('quickNote');
  const appointments = useItems('appointment');
  const { dialogs, write, edit, file } = useQuickNoteDialogs();
  const [choosing, setChoosing] = useState(false);
  const [addingAppointment, setAddingAppointment] = useState(false);
  const [message, setMessage] = useState('');
  const latest = notes?.at(-1);
  const now = today();
  const next = [...(appointments ?? [])]
    .filter((a) => a.data.date >= now)
    .sort((a, b) => `${a.data.date}${a.data.time}`.localeCompare(`${b.data.date}${b.data.time}`))[0];

  return (
    <>
      <h1 tabIndex={-1}>Keep everything together, so you don&rsquo;t have to start again.</h1>
      <DeviceOnlyBanner />

      <nav aria-label="What would you like to do?" className="tasks">
        <Button variant="primary" onPress={() => setChoosing(true)}>
          Add something
        </Button>
        <Button variant="primary" onPress={write}>
          Quick Note
        </Button>
        <Button variant="primary" onPress={() => navigate('find')}>
          Find in my record
        </Button>
        <Button variant="primary" onPress={() => navigate('use')}>
          Use my record
        </Button>
      </nav>
      <p role="status" className="quiet-status">
        {message}
      </p>

      {next && (
        <section aria-labelledby="next-appointment">
          <h2 id="next-appointment">Your next appointment</h2>
          <div className="note-card">
            <p className="entry-title">
              {readableDate(next.data.date)}
              {next.data.time && `, ${next.data.time}`}
            </p>
            <p>
              {next.data.organisation}
              {next.data.purpose && ` · ${next.data.purpose}`}
            </p>
            <RouteLink to="appointments">See all appointments</RouteLink>
          </div>
        </section>
      )}

      {latest && (
        <section aria-labelledby="latest-note">
          <h2 id="latest-note">Your latest Quick Note</h2>
          <QuickNoteCard note={latest} onEdit={edit} onFile={file} showDelete={false} />
          <p>
            <RouteLink to="quick-notes">See all Quick Notes</RouteLink>
          </p>
        </section>
      )}

      <section aria-labelledby="your-record">
        <h2 id="your-record">Your record</h2>
        <ul className="plain-list link-list">
          <li>
            <RouteLink to="what">What happened</RouteLink>
          </li>
          <li>
            <RouteLink to="impact">How it affects me</RouteLink>
          </li>
          <li>
            <RouteLink to="track">Keep track: appointments, treatment, letters, costs</RouteLink>
          </li>
        </ul>
      </section>

      <AddToPhonePrompt />

      <p>
        <RouteLink to="support">Find support</RouteLink>: helplines and charities, including urgent help.
      </p>

      <Dialog isOpen={choosing} onOpenChange={setChoosing} title="Add something">
        {(close, { finish }) => (
          <>
            <p>What would you like to add?</p>
            <div className="chooser chooser-list">
              {addChoices.map((c) => (
                <Button
                  key={c.label}
                  onPress={() => {
                    finish();
                    if (c.to === 'quick-note') write();
                    else if (c.to === 'appointment') setAddingAppointment(true);
                    else navigate(c.to);
                  }}
                >
                  {c.label}
                </Button>
              ))}
            </div>
            <div className="dialog-actions">
              <Button onPress={close}>Cancel</Button>
            </div>
          </>
        )}
      </Dialog>
      <AppointmentDialog
        isOpen={addingAppointment}
        onClose={() => setAddingAppointment(false)}
        onSaved={setMessage}
      />
      {dialogs}
    </>
  );
}
