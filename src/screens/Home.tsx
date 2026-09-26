import { useState } from "react";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Icon, type IconName } from "../components/icons";
import { TaskButton, TaskLink } from "../components/TaskCard";
import { today } from "../domain/dates";
import { readableDate } from "../domain/format";
import { QuickNoteCard } from "../features/quickNotes/QuickNoteCard";
import { useQuickNoteDialogs } from "../features/quickNotes/useQuickNoteDialogs";
import { AppointmentDialog } from "../features/track/AppointmentDialog";
import { navigate, RouteLink, type Route } from "../router";
import { AddToPhonePrompt } from "../shell/AddToPhonePrompt";
import { BackupReminder } from "../shell/BackupReminder";
import { useItems } from "../store/hooks";

// The eight kinds of thing you can add (docs/spec.md, "Add something").
const addChoices: {
  label: string;
  to: Route | "appointment" | "quick-note";
}[] = [
  { label: "What happened", to: "what" },
  { label: "An appointment", to: "appointment" },
  { label: "Treatment or medication", to: "treatment" },
  { label: "Something has changed", to: "impact" },
  { label: "A letter or document", to: "documents" },
  { label: "A cost or lost income", to: "costs" },
  { label: "A contact", to: "contacts" },
  { label: "A Quick Note", to: "quick-note" },
];

const utilityLinks: { to: Route; label: string; icon: IconName }[] = [
  { to: "how-to-use", label: "How to use", icon: "story" },
  { to: "faq", label: "Questions and answers", icon: "question" },
  { to: "add-to-phone", label: "Add to phone", icon: "phone" },
  { to: "privacy", label: "Privacy & backup", icon: "lock" },
];

export function Home() {
  const notes = useItems("quickNote");
  const appointments = useItems("appointment");
  const { dialogs, write, edit, file } = useQuickNoteDialogs();
  const [choosing, setChoosing] = useState(false);
  const [addingAppointment, setAddingAppointment] = useState(false);
  const [message, setMessage] = useState("");
  const latest = notes?.at(-1);
  const now = today();
  const next = [...(appointments ?? [])]
    .filter((a) => a.data.date >= now)
    .sort((a, b) =>
      `${a.data.date}${a.data.time}`.localeCompare(
        `${b.data.date}${b.data.time}`,
      ),
    )[0];

  return (
    <>
      <p className="kicker">After an injury, accident or illness&hellip;</p>
      <h1 tabIndex={-1} className="home-title">
        Keep everything together,{" "}
        <span className="home-title-soft">
          so you don&rsquo;t have to start again.
        </span>
      </h1>

      <h2 id="today" className="home-section-title">
        What do you need today?
      </h2>
      <nav aria-labelledby="today" className="task-cards">
        <TaskButton
          tone="add"
          icon="add"
          title="Add something"
          detail="What happened, an appointment, treatment, a change, a letter or anything else."
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
          onPress={() => navigate("find")}
        />
        <TaskButton
          icon="report"
          title="Use my record"
          detail="Make a Summary, Evidence Pack or Full Record."
          onPress={() => navigate("use")}
        />
      </nav>
      <p role="status" className="quiet-status">
        {message}
      </p>

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
            Your latest Quick Note
          </h2>
          <QuickNoteCard
            note={latest}
            onEdit={edit}
            onFile={file}
            showDelete={false}
          />
          <p>
            <RouteLink to="quick-notes">See all Quick Notes</RouteLink>
          </p>
        </section>
      )}

      {/* Folded away, as in the original app, so Home isn't overwhelming. */}
      <details className="home-more">
        <summary>
          <span className="home-more-title">Your record</span>
          <span className="home-more-detail">
            What happened, how it affects you, and keeping track
          </span>
        </summary>
        <div className="record-cards">
          <TaskLink
            to="what"
            icon="story"
            title="What happened"
            detail="The event, in your own words."
          />
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
        </div>
      </details>

      <BackupReminder />
      <AddToPhonePrompt />

      <nav aria-label="Help and settings" className="utility-links">
        <ul>
          {utilityLinks.map((l) => (
            <li key={l.to}>
              <RouteLink to={l.to}>
                <Icon name={l.icon} />
                {l.label}
              </RouteLink>
            </li>
          ))}
        </ul>
      </nav>

      <Dialog
        isOpen={choosing}
        onOpenChange={setChoosing}
        title="Add something"
      >
        {(close, { finish }) => (
          <>
            <p>What would you like to add?</p>
            <div className="chooser chooser-list">
              {addChoices.map((c) => (
                <Button
                  key={c.label}
                  onPress={() => {
                    finish();
                    if (c.to === "quick-note") write();
                    else if (c.to === "appointment") setAddingAppointment(true);
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
