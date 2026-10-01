import { useEffect, useRef, useState } from 'react';
import { reviewPages } from '../buildInfo';
import { Button } from '../components/Button';
import { Dialog, focusWhenDialogsClose } from '../components/Dialog';
import { Icon, type IconName } from '../components/icons';
import { TaskButton, TaskLink } from '../components/TaskCard';
import { today } from '../domain/dates';
import { readableDate } from '../domain/format';
import { QuickNoteCard } from '../features/quickNotes/QuickNoteCard';
import { useQuickNoteDialogs } from '../features/quickNotes/useQuickNoteDialogs';
import { AddToCalendarButton, type CalendarAppointment } from '../features/track/AddToCalendar';
import { AppointmentDialog, appointmentSaved } from '../features/track/AppointmentDialog';
import { ContactDialog } from '../features/track/ContactDialog';
import { CostDialog } from '../features/track/CostDialog';
import { DocumentDialog } from '../features/track/DocumentDialog';
import { MedicationDialog, TreatmentDialog } from '../features/track/TreatmentDialogs';
import { sectionLabels } from '../domain/vocab';
import { navigate, RouteLink, type Route } from '../router';
import { AddToPhonePrompt, useAddToPhone } from '../shell/AddToPhonePrompt';
import { BackupReminder, useBackupReminder } from '../shell/BackupReminder';
import { useItems, useRecordName } from '../store/hooks';

// Add something (docs/spec.md; made lighter 1 October 2026). Four big
// choices cover most of what people really add; the rest are one step
// further, under "Something else". Each opens its form straight away,
// except What happened and How it affects me, whose screens are the form.
type AddForm = 'quick-note' | 'letter' | 'appointment' | 'treatment' | 'medication' | 'cost' | 'contact';

const addChoices: { label: string; to: AddForm | 'more' }[] = [
  { label: 'Write or say something', to: 'quick-note' },
  { label: 'A photo of a letter or receipt', to: 'letter' },
  { label: 'An appointment', to: 'appointment' },
  { label: 'Something else…', to: 'more' },
];

const moreChoices: { label: string; to: AddForm | Route }[] = [
  { label: 'What happened', to: 'what' },
  { label: 'Treatment', to: 'treatment' },
  { label: 'Medication', to: 'medication' },
  { label: 'A cost or lost income', to: 'cost' },
  { label: 'A contact', to: 'contact' },
  { label: 'Something has changed', to: 'impact' },
];

// Said once a form opened from Home is saved, since the list it went into
// isn't on screen.
const savedIn = (section: keyof typeof sectionLabels) => `Saved in ${sectionLabels[section]}.`;

const utilityLinks: { to: Route; label: string; icon: IconName }[] = [
  { to: 'help', label: 'Help', icon: 'question' },
  // Only once the "Keep Say It Once on your phone" box has been put away
  // (see useAddToPhone), so the two never show together.
  { to: 'add-to-phone', label: 'Add to phone', icon: 'phone' },
  { to: 'privacy', label: 'Privacy & backup', icon: 'lock' },
  // Only in Deploy Previews, for the owner's review (src/buildInfo.ts).
  ...(reviewPages
    ? [{ to: 'building-blocks' as const, label: 'Building blocks (for review)', icon: 'story' as const }]
    : []),
];

export function Home() {
  const notes = useItems('quickNote');
  const appointments = useItems('appointment');
  const recordName = useRecordName();
  const addToPhone = useAddToPhone();
  // One reminder at a time, backup first: the Add to phone box waits (and
  // its link stands in for it) while the backup reminder is showing.
  const backupDue = useBackupReminder();
  const showPhoneBox = addToPhone.state === 'prompt' && !backupDue;
  const showPhoneLink = addToPhone.state === 'dismissed' || (addToPhone.state === 'prompt' && backupDue);
  // After Not now, the box goes and the Add to phone link appears in its
  // place further down; focus moves to it rather than being lost.
  const focusAddToPhone = useRef(false);
  useEffect(() => {
    if (!focusAddToPhone.current || addToPhone.state !== 'dismissed') return;
    focusAddToPhone.current = false;
    document.querySelector<HTMLElement>('.utility-links a[href="#add-to-phone"]')?.focus();
  }, [addToPhone.state]);
  const heading = useRef<HTMLHeadingElement>(null);
  // A filed note leaves Home, taking its File button with it, so focus goes
  // to the page heading rather than being lost.
  const { dialogs, write, edit, file } = useQuickNoteDialogs({
    onFiled: () => focusWhenDialogsClose(() => heading.current),
  });
  const [choosing, setChoosing] = useState(false);
  const [choosingMore, setChoosingMore] = useState(false);
  const [adding, setAdding] = useState<AddForm | null>(null);
  const [message, setMessage] = useState('');
  const [justAdded, setJustAdded] = useState<CalendarAppointment | null>(null);
  // Home shows only notes still waiting to be filed; filed ones live in
  // their section and on Quick Notes.
  function startAdding(form: AddForm) {
    setMessage('');
    setJustAdded(null);
    if (form === 'quick-note') write();
    else setAdding(form);
  }
  function said(text: string) {
    setMessage(text);
    setJustAdded(null);
  }
  const toFile = (notes ?? []).filter((n) => n.data.filedTo === null);
  const latest = toFile.at(-1);
  const now = today();
  const next = [...(appointments ?? [])]
    .filter((a) => a.data.date >= now)
    .sort((a, b) => `${a.data.date}${a.data.time}`.localeCompare(`${b.data.date}${b.data.time}`))[0];

  return (
    <>
      <p className="kicker">After an injury, accident or illness&hellip;</p>
      <h1 ref={heading} tabIndex={-1} className="home-title">
        Keep everything together, <span className="home-title-soft">so you don&rsquo;t have to start again.</span>
      </h1>
      {/* Always on Home, so people know from the start that they can keep
          more than one record, and can see which one they're adding to. */}
      {recordName && (
        <p className="record-tag home-record-tag">
          Record: <strong>{recordName}</strong> · <RouteLink to="records">Change</RouteLink>
        </p>
      )}

      <h2 id="today" className="home-section-title">
        What do you need today?
      </h2>
      <nav aria-labelledby="today" className="task-cards">
        <TaskButton
          tone="add"
          icon="add"
          title="Add something"
          detail="A note, a photo of a letter, an appointment or anything else."
          onPress={() => setChoosing(true)}
        />
        <TaskButton
          icon="note"
          title="Quick Note"
          detail="Write a few words or add a photo, and file it later."
          onPress={write}
        />
        <TaskButton
          icon="search"
          title="Find in my record"
          detail="Search everything you’ve added."
          onPress={() => navigate('find')}
        />
        <TaskButton
          icon="report"
          title="Use my record"
          detail="Make a Summary, Evidence Pack or Full Record."
          onPress={() => navigate('use')}
        />
      </nav>
      <p role="status" className="quiet-status">
        {message}
      </p>
      {justAdded && message === appointmentSaved && (
        <div className="button-row">
          <AddToCalendarButton appt={justAdded} onMessage={setMessage} />
        </div>
      )}

      <TaskLink
        to="support"
        tone="support"
        icon="support"
        title="Find support"
        detail="Helplines and organisations, including urgent help."
      />

      {next && (
        <section aria-labelledby="next-appointment">
          <h2 id="next-appointment" className="home-section-title">
            Your next appointment
          </h2>
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
          <h2 id="latest-note" className="home-section-title">
            A Quick Note to file
          </h2>
          <QuickNoteCard note={latest} onEdit={edit} onFile={file} showDelete={false} />
          {toFile.length > 1 && (
            <p>
              {toFile.length - 1 === 1 ? '1 more note' : `${toFile.length - 1} more notes`} to file when you&rsquo;re
              ready.
            </p>
          )}
          <p>
            <RouteLink to="quick-notes">See all Quick Notes</RouteLink>
          </p>
        </section>
      )}

      {/* Folded away, as in the original app, so Home isn't overwhelming. */}
      <details className="home-more">
        <summary>
          <span className="home-more-title">Look back at your record</span>
          <span className="home-more-detail">See and change what you&rsquo;ve already added</span>
        </summary>
        <div className="record-cards">
          <TaskLink to="what" icon="story" title="What happened" detail="The event, in your own words." />
          <TaskLink
            to="impact"
            icon="impact"
            title="How it affects me"
            detail="Daily life, work, health and changes."
          />
          <TaskLink
            to="track"
            icon="calendar"
            title="Keep track"
            detail="Appointments, treatment, letters, costs and contacts."
          />
          <TaskLink to="quick-notes" icon="note" title="Quick Notes" detail="Every note, filed or not." />
          <TaskLink
            to="records"
            icon="folder"
            title="My records"
            detail="Start another record, or rename or delete one."
          />
        </div>
      </details>

      {backupDue && <BackupReminder />}
      {showPhoneBox && (
        <AddToPhonePrompt
          onDismiss={() => {
            addToPhone.dismiss();
            focusAddToPhone.current = true;
          }}
        />
      )}

      <nav aria-label="Help and settings" className="utility-links">
        <ul>
          {utilityLinks
            .filter((l) => l.to !== 'add-to-phone' || showPhoneLink)
            .map((l) => (
              <li key={l.to}>
                <RouteLink to={l.to}>
                  <Icon name={l.icon} />
                  {l.label}
                </RouteLink>
              </li>
            ))}
        </ul>
      </nav>

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
                    if (c.to === 'more') setChoosingMore(true);
                    else startAdding(c.to);
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
      <Dialog isOpen={choosingMore} onOpenChange={setChoosingMore} title="Something else">
        {(close, { finish }) => (
          <>
            <p>What would you like to add?</p>
            <div className="chooser chooser-list">
              {moreChoices.map((c) => (
                <Button
                  key={c.label}
                  onPress={() => {
                    finish();
                    if (c.to === 'what' || c.to === 'impact') navigate(c.to);
                    else startAdding(c.to as AddForm);
                  }}
                >
                  {c.label}
                </Button>
              ))}
            </div>
            <div className="dialog-actions">
              <Button
                onPress={() => {
                  finish();
                  setChoosing(true);
                }}
              >
                Back
              </Button>
              <Button onPress={close}>Cancel</Button>
            </div>
          </>
        )}
      </Dialog>
      <AppointmentDialog
        isOpen={adding === 'appointment'}
        onClose={() => setAdding(null)}
        onSaved={(m, forCalendar) => {
          setMessage(m);
          setJustAdded(forCalendar ?? null);
        }}
      />
      <DocumentDialog edit={adding === 'letter' ? {} : null} onClose={() => setAdding(null)} onDone={() => said(savedIn('documents'))} />
      <TreatmentDialog edit={adding === 'treatment' ? {} : null} onClose={() => setAdding(null)} onDone={() => said(savedIn('treatment'))} />
      <MedicationDialog edit={adding === 'medication' ? {} : null} onClose={() => setAdding(null)} onDone={() => said(savedIn('treatment'))} />
      <CostDialog edit={adding === 'cost' ? {} : null} onClose={() => setAdding(null)} onDone={() => said(savedIn('costs'))} />
      <ContactDialog edit={adding === 'contact' ? {} : null} onClose={() => setAdding(null)} onDone={() => said(savedIn('contacts'))} />
      {dialogs}
    </>
  );
}
