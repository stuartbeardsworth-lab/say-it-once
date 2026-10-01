import { MicHelp } from '../components/MicHelp';
import { anyFilled, MoreDetail } from '../components/MoreDetail';
import { SaveStatus } from '../components/SaveStatus';
import { TextArea, TextField } from '../components/TextField';
import { blank } from '../domain/blank';
import type { IncidentData } from '../domain/types';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { WorkDetailsDialog } from '../features/work/WorkDetailsDialog';
import { Button } from '../components/Button';
import { useItems } from '../store/hooks';
import { useState } from 'react';
import { useAutosave } from '../forms/useAutosave';
import { useItemDraft } from '../forms/useItemDraft';
import { PageTop } from '../shell/PageTop';
import { StorageProblem } from '../store/problems';
import { useRecordId, useStore } from '../store/StoreContext';

// The account of what happened (docs/spec.md, "what"). Everything saves as
// the person types, and every field is optional.

export function WhatHappened() {
  const { store } = useStore();
  const recordId = useRecordId();
  const { draft, updateData } = useItemDraft<'incident'>(
    async () => (recordId ? store.getSingleton(recordId, 'incident') : undefined),
    () => blank('incident'),
    recordId ? `incident:${recordId}` : null,
  );

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>What happened</h1>
      <p>
        Write as much or as little as you like. A few words are enough, and you can come back to it any time. It
        saves as you type.
      </p>
      <MicHelp />
      {draft ? (
        <IncidentForm
          key={draft.id}
          data={draft.data}
          onChange={updateData}
          save={async (data) => {
            if (!recordId) throw new StorageProblem('unavailable');
            await store.save('incident', recordId, data, { id: draft.id });
          }}
        />
      ) : (
        <p>Loading…</p>
      )}
      <WorkAtTheTime />
      <FiledNotes section="what" />
    </>
  );
}

interface IncidentFormProps {
  data: IncidentData;
  onChange: (update: (data: IncidentData) => IncidentData) => void;
  save: (data: IncidentData) => Promise<void>;
}

function IncidentForm({ data, onChange, save }: IncidentFormProps) {
  const autosave = useAutosave(data, save);
  const field = (name: keyof IncidentData) => ({
    value: data[name],
    onChange: (value: string) => onChange((d) => ({ ...d, [name]: value })),
    onBlur: () => void autosave.flush(),
  });

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="field-row">
        <TextField label="Date" type="date" {...field('date')} />
        <TextField label="Time (optional)" type="time" {...field('time')} />
      </div>
      <TextField label="Where did it happen?" {...field('place')} />
      <TextArea label="What happened?" {...field('what')} rows={6} />
      <TextArea label="What happened next?" {...field('after')} rows={4} />

      {/* It saves as the person types, so the line says "enough", not
          "enough to save". */}
      <MoreDetail
        note="That’s enough. You can add more later, or never."
        hasContent={anyFilled(
          data.treatment,
          data.complications,
          data.ongoingCare,
          data.injuries,
          data.before,
          data.told,
          data.witnesses,
          data.services,
        )}
      >
        <TextArea label="Injuries or symptoms" {...field('injuries')} />
        <TextArea label="Treatment straight afterwards" hint="For example, at the scene or in A&E." {...field('treatment')} />
        <TextArea label="Complications" {...field('complications')} />
        <TextArea label="Ongoing care" {...field('ongoingCare')} />
        <TextArea label="Beforehand" hint="What you were doing, or how you were, before it happened." {...field('before')} />
        <TextArea label="What were you told at the time?" {...field('told')} />
        <TextArea label="Other people there" {...field('witnesses')} />
        <TextArea label="Police, ambulance or fire service" {...field('services')} />
      </MoreDetail>

      <SaveStatus status={autosave.status} onDismiss={autosave.dismiss} />
    </form>
  );
}

/** Work details, for an Industrial Injuries claim. Optional. */
function WorkAtTheTime() {
  const work = useItems('workDetails')?.[0];
  const [open, setOpen] = useState(false);
  const d = work?.data;
  return (
    <section aria-labelledby="work-heading">
      <h2 id="work-heading">Work at the time (optional)</h2>
      {d && (d.employer || d.jobTitle || d.workplace) ? (
        <p>{[d.jobTitle, d.employer, d.workplace].filter(Boolean).join(', ')}</p>
      ) : (
        <p>If it happened at work, these details help with an Industrial Injuries claim.</p>
      )}
      <Button onPress={() => setOpen(true)}>{work ? 'Edit work details' : 'Add work details'}</Button>
      <WorkDetailsDialog isOpen={open} existing={work} onClose={() => setOpen(false)} />
    </section>
  );
}
