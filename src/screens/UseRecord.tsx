import { useEffect, useId, useState } from 'react';
import { Button } from '../components/Button';
import { today } from '../domain/dates';
import type { AnyItem } from '../domain/types';
import { WorkDetailsDialog } from '../features/work/WorkDetailsDialog';
import { buildReport, reportText } from '../reports/model';
import { audiences, purposeByKey, purposes } from '../reports/purposes';
import { ReadingView } from '../reports/ReadingView';
import { defaultSelection } from '../reports/selection';
import { toShareable } from '../shareable/toShareable';
import { PageTop } from '../shell/PageTop';
import { useRecordId, useStore } from '../store/StoreContext';
import { useLiveQuery } from '../store/useLiveQuery';

// Use my record, first version (Stage 4a): choose what it's for and read the
// report. Checking and changing what goes in arrives in Stage 4b. Everything
// shown is built from toShareable(): nothing private can reach it.

function useReadAloud() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);
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

export function UseRecord() {
  const { store } = useStore();
  const recordId = useRecordId();
  const selectId = useId();
  const [purposeKey, setPurposeKey] = useState('');
  const [editingWork, setEditingWork] = useState(false);
  const readAloud = useReadAloud();
  const data = useLiveQuery(
    async () => {
      if (!recordId) return null;
      const [items, profile] = await Promise.all([store.listAll(recordId), store.getProfile()]);
      return { items: items as AnyItem[], personName: profile?.data.personName ?? '' };
    },
    `use:${recordId ?? ''}`,
  );

  const purpose = purposeByKey(purposeKey);
  const shared = data && recordId ? toShareable(recordId, data.items, data.personName) : null;
  const report = purpose && shared ? buildReport(shared.view, purpose, defaultSelection(purpose, shared.view, today()), { today: today() }) : null;
  const workItem = data?.items.find((i) => i.type === 'workDetails') as import('../domain/types').Item<'workDetails'> | undefined;
  const needsWork = purposeKey === 'iidb' && !(workItem?.data.employer || workItem?.data.jobTitle || workItem?.data.workplace);

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Use my record</h1>
      <div className="no-print">
        <p>Choose who it’s for. Say It Once puts together the parts of your record that help, and leaves out anything private.</p>
        <div className="field">
          <label className="field-label" htmlFor={selectId}>
            Who is it for, and what do they need?
          </label>
          <select id={selectId} className="field-input" value={purposeKey} onChange={(e) => setPurposeKey(e.target.value)}>
            <option value="">Choose one</option>
            {audiences.map((a) => (
              <optgroup key={a.key} label={a.label}>
                {purposes
                  .filter((p) => p.audience === a.key)
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.need}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {shared && shared.excluded.total > 0 && (
          <p className="notice notice-info">
            {shared.excluded.total === 1 ? '1 private entry is' : `${shared.excluded.total} private entries are`} not
            included, and never will be unless you untick “Keep this private” on them.
          </p>
        )}

        {needsWork && (
          <div className="notice notice-info">
            <p>This pack includes your work at the time of the accident, which you haven’t added yet.</p>
            <Button onPress={() => setEditingWork(true)}>Add your work details</Button>
          </div>
        )}

        {report && report.personalInfo.length > 0 && (
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

        {report && (
          <div className="button-row">
            <Button onPress={() => window.print()}>Print</Button>
            {readAloud.supported &&
              (readAloud.speaking ? (
                <Button onPress={readAloud.stop}>Stop reading aloud</Button>
              ) : (
                <Button onPress={() => readAloud.start(reportText(report).join('. '))}>Read aloud</Button>
              ))}
          </div>
        )}
      </div>

      {report && <ReadingView report={report} />}
      {data === null && <p>Say It Once can’t open your record at the moment.</p>}

      <WorkDetailsDialog isOpen={editingWork} existing={workItem} onClose={() => setEditingWork(false)} />
    </>
  );
}
