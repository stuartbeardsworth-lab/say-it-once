import { SaveStatus } from '../components/SaveStatus';
import { TextArea, TextField } from '../components/TextField';
import { blank } from '../domain/blank';
import type { IncidentData } from '../domain/types';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
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
  const { draft, setData } = useItemDraft<'incident'>(
    async () => (recordId ? store.getSingleton(recordId, 'incident') : undefined),
    () => blank('incident'),
    `incident:${recordId ?? ''}`,
  );

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>What happened</h1>
      <p>
        Write as much or as little as you like. A few words are enough, and you can come back to it any time. It
        saves as you type. To speak instead of typing, use the microphone on your phone’s keyboard.
      </p>
      {draft ? (
        <IncidentForm
          key={draft.id}
          data={draft.data}
          onChange={setData}
          save={async (data) => {
            if (!recordId) throw new StorageProblem('unavailable');
            await store.save('incident', recordId, data, { id: draft.id });
          }}
        />
      ) : (
        <p>Loading…</p>
      )}
      <FiledNotes section="what" />
    </>
  );
}

interface IncidentFormProps {
  data: IncidentData;
  onChange: (data: IncidentData) => void;
  save: (data: IncidentData) => Promise<void>;
}

function IncidentForm({ data, onChange, save }: IncidentFormProps) {
  const autosave = useAutosave(data, save);
  const field = (name: keyof IncidentData) => ({
    value: data[name],
    onChange: (value: string) => onChange({ ...data, [name]: value }),
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

      <details className="more">
        <summary>Treatment and what came next</summary>
        <TextArea label="Treatment straight afterwards" hint="For example, at the scene or in A&E." {...field('treatment')} />
        <TextArea label="Complications" {...field('complications')} />
        <TextArea label="Ongoing care" {...field('ongoingCare')} />
      </details>

      <details className="more">
        <summary>Other details</summary>
        <TextArea label="Injuries or symptoms" {...field('injuries')} />
        <TextArea label="Beforehand" hint="What you were doing, or how you were, before it happened." {...field('before')} />
        <TextArea label="What were you told at the time?" {...field('told')} />
        <TextArea label="Other people there" {...field('witnesses')} />
        <TextArea label="Police, ambulance or fire service" {...field('services')} />
      </details>

      <SaveStatus status={autosave.status} onDismiss={autosave.dismiss} />
    </form>
  );
}
