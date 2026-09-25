import { useState } from 'react';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { today } from '../domain/dates';
import { readableDate } from '../domain/format';
import type { Item, TreatmentData } from '../domain/types';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { MedicationDialog, TreatmentDialog } from '../features/track/TreatmentDialogs';
import { RouteLink } from '../router';
import { PageTop } from '../shell/PageTop';
import { useItems } from '../store/hooks';
import { useRecordId, useStore } from '../store/StoreContext';
import { useLiveQuery } from '../store/useLiveQuery';

export function Treatment() {
  const { store } = useStore();
  const recordId = useRecordId();
  const treatments = useItems('treatment');
  const medications = useItems('medication');
  const incident = useLiveQuery(
    () => (recordId ? store.getSingleton(recordId, 'incident') : Promise.resolve(undefined)),
    `incident:${recordId ?? ''}`,
  );
  const [treatmentEdit, setTreatmentEdit] = useState<{ existing?: Item<'treatment'>; prefill?: Partial<TreatmentData> } | null>(null);
  const [medicationEdit, setMedicationEdit] = useState<{ existing?: Item<'medication'> } | null>(null);
  const [repeating, setRepeating] = useState(false);

  const sortedTreatments = [...(treatments ?? [])].sort((a, b) => (b.data.date || b.createdAt).localeCompare(a.data.date || a.createdAt));
  const previousNames = [...new Set(sortedTreatments.map((t) => t.data.name.trim()).filter(Boolean))].slice(0, 10);

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Treatment &amp; medication</h1>

      <section aria-labelledby="treatment-heading">
        <h2 id="treatment-heading">Treatment</h2>
        <div className="button-row">
          <Button variant="primary" onPress={() => setTreatmentEdit({})}>
            Add a treatment
          </Button>
          {previousNames.length > 0 && <Button onPress={() => setRepeating(true)}>Repeat a previous one</Button>}
        </div>
        {incident?.data.treatment && (
          <div className="note-card">
            <p className="entry-title">Straight afterwards</p>
            <p className="note-text">{incident.data.treatment}</p>
            <p className="field-hint">
              From <RouteLink to="what">What happened</RouteLink>.
            </p>
          </div>
        )}
        {sortedTreatments.length === 0 ? (
          <p>No treatments added yet.</p>
        ) : (
          <ul className="entry-list">
            {sortedTreatments.map((t) => (
              <li key={t.id} className="note-card">
                <h3 className="entry-title">{t.data.name}</h3>
                <p className="entry-meta">{[t.data.date && readableDate(t.data.date), t.data.effect].filter(Boolean).join(' · ')}</p>
                {t.data.note && <p className="note-text">{t.data.note}</p>}
                {t.private && <p className="field-hint">Private</p>}
                <Button onPress={() => setTreatmentEdit({ existing: t })}>Edit</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="medication-heading">
        <h2 id="medication-heading">Medication</h2>
        <Button variant="primary" onPress={() => setMedicationEdit({})}>
          Add a medication
        </Button>
        {(medications ?? []).length === 0 ? (
          <p>No medication added yet.</p>
        ) : (
          <ul className="entry-list">
            {(medications ?? []).map((m) => (
              <li key={m.id} className="note-card">
                <h3 className="entry-title">{m.data.name}</h3>
                <p className="entry-meta">
                  {[m.data.dose, m.data.often, m.data.forWhat && `for ${m.data.forWhat}`, m.data.status].filter(Boolean).join(' · ')}
                </p>
                {m.private && <p className="field-hint">Private</p>}
                <Button onPress={() => setMedicationEdit({ existing: m })}>Edit</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FiledNotes section="treatment" />

      <Dialog isOpen={repeating} onOpenChange={setRepeating} title="Repeat a previous treatment">
        {(close, { finish }) => (
          <>
            <p>Choose one to add again with today’s date.</p>
            <div className="chooser chooser-list">
              {previousNames.map((name) => (
                <Button
                  key={name}
                  onPress={() => {
                    finish();
                    setTreatmentEdit({ prefill: { name, date: today() } });
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="dialog-actions">
              <Button onPress={close}>Cancel</Button>
            </div>
          </>
        )}
      </Dialog>
      <TreatmentDialog edit={treatmentEdit} onClose={() => setTreatmentEdit(null)} />
      <MedicationDialog edit={medicationEdit} onClose={() => setMedicationEdit(null)} />
    </>
  );
}
