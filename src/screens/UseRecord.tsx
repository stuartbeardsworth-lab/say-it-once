import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { RadioList } from '../components/RadioList';
import { today } from '../domain/dates';
import type { AnyItem, Item } from '../domain/types';
import { ChooseEntriesDialog } from '../features/use/ChooseEntriesDialog';
import { takeResults } from '../features/use/handoff';
import { WorkDetailsDialog } from '../features/work/WorkDetailsDialog';
import { buildReport, reportText } from '../reports/model';
import { audiences, purposeByKey, purposes, type Audience, type SectionKey } from '../reports/purposes';
import { ReadingView } from '../reports/ReadingView';
import {
  candidates,
  countShareable,
  defaultSelection,
  describeRule,
  fixedSections,
  hasContent,
  sectionTitle,
  selectionFromIds,
  type Selection,
} from '../reports/selection';
import { toShareable } from '../shareable/toShareable';
import { RouteLink } from '../router';
import { PageTop } from '../shell/PageTop';
import { useRecordId, useStore } from '../store/StoreContext';
import { useLiveQuery } from '../store/useLiveQuery';

// Use my record (docs/spec.md, "packs"; decisions Q3, Q4, Q12, Q15), in
// four steps: who it's for, what they need, what goes in, and the report.
// Everything is chosen from toShareable()'s view, so nothing private can be
// offered, ticked or included.

type Step = 'who' | 'need' | 'check' | 'report';

function useReadAloud() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel();
    },
    [supported],
  );
  return {
    supported,
    speaking,
    start(text: string) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    stop() {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    },
  };
}

// [one, several] for each kind of entry, so a count reads naturally.
const privateKindLabels: Record<string, [string, string]> = {
  impactArea: ['area of How it affects me', 'areas of How it affects me'],
  impactNote: ['note in Anything else this has changed', 'notes in Anything else this has changed'],
  checkIn: ['check-in', 'check-ins'],
  appointment: ['appointment', 'appointments'],
  treatment: ['treatment', 'treatments'],
  medication: ['medication', 'medications'],
  cost: ['cost', 'costs'],
  document: ['letter or document', 'letters or documents'],
  contact: ['contact', 'contacts'],
  quickNote: ['Quick Note', 'Quick Notes'],
};

function privateKindLabel(kind: string, n: number): string {
  const labels = privateKindLabels[kind];
  return labels ? labels[n === 1 ? 0 : 1] : kind;
}

export function UseRecord() {
  const { store } = useStore();
  const recordId = useRecordId();
  const readAloud = useReadAloud();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>('who');
  const [audience, setAudience] = useState<Audience | null>(null);
  const [purposeKey, setPurposeKey] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [results] = useState(() => takeResults());
  const [choosing, setChoosing] = useState<SectionKey | null>(null);
  const [editingWork, setEditingWork] = useState(false);
  const [error, setError] = useState<string>();
  const firstStep = useRef(true);

  const data = useLiveQuery(
    async () => {
      if (!recordId) return null;
      const [items, profile] = await Promise.all([store.listAll(recordId), store.getProfile()]);
      return { items: items as AnyItem[], personName: profile?.data.personName ?? '' };
    },
    `use:${recordId ?? ''}`,
  );

  // Each step's heading takes focus, so it's clear the page has moved on.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const shared = data && recordId ? toShareable(recordId, data.items, data.personName) : null;
  const purpose = purposeKey ? purposeByKey(purposeKey) : undefined;
  const report = purpose && shared && step === 'report' ? buildReport(shared.view, purpose, selection, { today: today() }) : null;
  const workItem = data?.items.find((i) => i.type === 'workDetails') as Item<'workDetails'> | undefined;
  const needsWork = purposeKey === 'iidb' && !(workItem?.data.employer || workItem?.data.jobTitle || workItem?.data.workplace);

  function choosePurpose(key: string) {
    const p = purposeByKey(key);
    if (!p || !shared) return;
    setPurposeKey(key);
    setSelection(results ? selectionFromIds(p, shared.view, results) : defaultSelection(p, shared.view, today()));
    setStep('check');
  }

  function setSection(key: SectionKey, update: Partial<{ included: boolean; ids: string[] }>) {
    setSelection((s) => ({ ...s, [key]: { included: s[key]?.included ?? false, ids: s[key]?.ids ?? [], ...update } }));
  }

  const heading = (text: string) => (
    <h2 ref={headingRef} tabIndex={-1}>
      {text}
    </h2>
  );

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Use my record</h1>

      {results && shared && step !== 'report' && (
        <p className="notice notice-info">
          Using {countShareable(shared.view, results)} of your {results.length} search results.
          {countShareable(shared.view, results) < results.length &&
            ' The others are private, so they won’t be included.'}
        </p>
      )}

      {step === 'who' && (
        <section aria-labelledby="step-who">
          <h2 id="step-who" ref={headingRef} tabIndex={-1}>
            Who is it for?
          </h2>
          <p>Say It Once puts together the parts of your record that help, and leaves out anything private.</p>
          <RadioList
            label="Choose one"
            options={audiences.map((a) => ({ value: a.key, label: a.label }))}
            value={audience}
            onChange={(v) => {
              setAudience(v);
              setError(undefined);
            }}
            errorMessage={error}
          />
          <div className="button-row">
            <Button
              variant="primary"
              onPress={() => {
                if (!audience) setError('Choose who it’s for.');
                else setStep('need');
              }}
            >
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 'need' && audience && (
        <section aria-labelledby="step-need">
          {heading('What do they need?')}
          <RadioList
            label="Choose one"
            options={purposes.filter((p) => p.audience === audience).map((p) => ({ value: p.key, label: `${p.need}: ${p.title}` }))}
            value={purposeKey}
            onChange={(v) => {
              setPurposeKey(v);
              setError(undefined);
            }}
            errorMessage={error}
          />
          <div className="button-row">
            <Button onPress={() => setStep('who')}>Back</Button>
            <Button
              variant="primary"
              onPress={() => {
                if (!purposeKey) setError('Choose what they need.');
                else choosePurpose(purposeKey);
              }}
            >
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 'check' && purpose && shared && (
        <section aria-labelledby="step-check">
          {heading(`What goes in: ${purpose.title}`)}
          <p>{purpose.intro}</p>
          {shared.excluded.total > 0 && (
            <details className="notice notice-info">
              <summary>
                {shared.excluded.total === 1 ? '1 private entry is' : `${shared.excluded.total} private entries are`} not
                included
              </summary>
              <ul>
                {Object.entries(shared.excluded.byKind).map(([kind, n]) => (
                  <li key={kind}>
                    {n} {privateKindLabel(kind, n ?? 0)}
                  </li>
                ))}
              </ul>
              <p>To include one, open it and untick “Keep this private”.</p>
            </details>
          )}
          {needsWork && (
            <div className="notice notice-info">
              <p>This pack includes your work at the time of the accident, which you haven’t added yet.</p>
              <Button onPress={() => setEditingWork(true)}>Add your work details</Button>
            </div>
          )}
          <ul className="entry-list">
            {purpose.sections.map((s) => {
              const title = sectionTitle(purpose, s.key);
              const available = hasContent(shared.view, s.key);
              const all = candidates(shared.view, s.key);
              const sel = selection[s.key];
              const fixed = fixedSections.has(s.key);
              return (
                <li key={s.key} className="note-card">
                  <Checkbox
                    label={title}
                    hint={
                      !available
                        ? 'Nothing recorded yet.'
                        : fixed
                          ? 'Worked out from your record.'
                          : `${sel?.ids.length ?? 0} of ${all.length} entries. Suggested: ${describeRule(s.rule)}.`
                    }
                    isSelected={available && (sel?.included ?? false)}
                    onChange={(on) => available && setSection(s.key, { included: on })}
                  />
                  {available && !fixed && all.length > 0 && (
                    <Button onPress={() => setChoosing(s.key)}>Choose entries</Button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="button-row">
            <Button onPress={() => setStep('need')}>Back</Button>
            <Button variant="primary" onPress={() => setStep('report')}>
              Create the report
            </Button>
          </div>
        </section>
      )}

      {step === 'report' && report && (
        <section aria-labelledby="step-report">
          <div className="no-print">
            {heading('Your report')}
            {report.personalInfo.length > 0 && (
              <div className="notice notice-info" role="note" aria-label="Before you share this">
                <p className="notice-title">Before you share this</p>
                <p>It includes some personal information:</p>
                <ul>
                  {report.personalInfo.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p>Check you’re happy for the person you give it to to see this.</p>
              </div>
            )}
            {report.sections.length === 0 && <p>Nothing is included yet. Go back and choose what goes in.</p>}
            <div className="button-row">
              <Button onPress={() => setStep('check')}>Change what’s included</Button>
              <Button onPress={() => window.print()}>Print</Button>
              {readAloud.supported &&
                (readAloud.speaking ? (
                  <Button onPress={readAloud.stop}>Stop reading aloud</Button>
                ) : (
                  <Button onPress={() => readAloud.start(reportText(report).join('. '))}>Read aloud</Button>
                ))}
            </div>
            <p className="field-hint">Saving as PDF and as a zip with the documents comes next.</p>
          </div>
          <ReadingView report={report} />
        </section>
      )}

      {data === null && <p>Say It Once can’t open your record at the moment.</p>}
      {step === 'who' && (
        <p>
          Looking for something particular? Use <RouteLink to="find">Find in my record</RouteLink>, then “Use these
          results”.
        </p>
      )}

      {purpose && shared && (
        <ChooseEntriesDialog
          title={choosing ? sectionTitle(purpose, choosing) : null}
          candidates={choosing ? candidates(shared.view, choosing) : []}
          chosen={choosing ? (selection[choosing]?.ids ?? []) : []}
          onClose={() => setChoosing(null)}
          onChoose={(ids) => {
            if (choosing) setSection(choosing, { ids, included: ids.length > 0 });
            setChoosing(null);
          }}
        />
      )}
      <WorkDetailsDialog
        isOpen={editingWork}
        existing={workItem}
        onClose={() => {
          setEditingWork(false);
          // If details were saved, the section now has content: put it in.
          setSection('work', { included: true });
        }}
      />
    </>
  );
}
