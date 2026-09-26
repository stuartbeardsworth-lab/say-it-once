import { useState } from 'react';
import { Button } from '../../components/Button';
import { makePdf } from '../../reports/makePdf';
import type { Report } from '../../reports/model';
import { canShareFile, downloadFile, isAppleHomeScreenApp, safeFileName, shareFile, type DeliveryResult } from './deliver';

// Make a PDF or a zip of the report, then share or save it. Two taps on
// purpose: phones only open the share options straight after a tap, and
// making the file can take a few seconds, so it is made first and shared
// second.

type Kind = 'pdf' | 'zip';

const words: Record<Kind, { name: string; making: string }> = {
  pdf: { name: 'PDF', making: 'Making the PDF…' },
  zip: { name: 'zip file', making: 'Making the zip file…' },
};

type Ready = { step: 'ready'; kind: Kind; file: File; missing: string[]; result: DeliveryResult | null };
type State = { step: 'start' } | { step: 'making'; kind: Kind } | Ready | { step: 'failed'; kind: Kind };

export interface SendReportProps {
  report: Report;
  /** Reads one of the report's letters or photos, for the zip. */
  readFile: (fileId: string) => Promise<Blob | undefined>;
  /** Called once a file has left the app, to note which entries were in it. */
  onSent: (itemIds: string[]) => void;
}

function size(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function build(kind: Kind, report: Report, readFile: SendReportProps['readFile']) {
  const base = safeFileName('Say It Once', report.title, report.recordName);
  const pdf = await makePdf(report);
  if (kind === 'pdf') return { file: new File([pdf], `${base}.pdf`, { type: 'application/pdf' }), missing: [] };
  // The zip maker (and the HTML copy inside it) loads only when first needed.
  const { makeZip } = await import('../../reports/zip');
  const { zip, missing } = await makeZip(report, pdf, readFile);
  return { file: new File([zip], `${base}.zip`, { type: 'application/zip' }), missing };
}

export function SendReport({ report, readFile, onSent }: SendReportProps) {
  const [state, setState] = useState<State>({ step: 'start' });
  const [dismissed, setDismissed] = useState(false);
  const attachments = report.evidence.filter((e) => e.fileId).length + report.photos.length;

  async function make(kind: Kind) {
    setState({ step: 'making', kind });
    setDismissed(false);
    try {
      const { file, missing } = await build(kind, report, readFile);
      setState({ step: 'ready', kind, file, missing, result: null });
    } catch {
      setState({ step: 'failed', kind });
    }
  }

  async function deliver(ready: Ready, how: 'share' | 'download') {
    setDismissed(false);
    const result = how === 'share' ? await shareFile(ready.file, report.title) : downloadFile(ready.file);
    setState({ ...ready, result });
    if (result.outcome === 'shared' || result.outcome === 'downloading') onSent(report.itemIds);
  }

  const ready = state.step === 'ready' ? state : null;
  const result = ready?.result ?? null;
  const name = state.step === 'start' ? '' : words[state.kind].name;
  const share = ready ? canShareFile(ready.file) : false;
  // A home-screen app on an iPhone saves through the share options instead.
  const download = ready ? !(share && isAppleHomeScreenApp()) : false;

  let quiet = '';
  if (state.step === 'making') quiet = words[state.kind].making;
  else if (ready && !result) quiet = `Your ${name} is ready (${size(ready.file.size)}).`;
  else if (result?.outcome === 'shared') quiet = 'Passed to the app you chose. Check there that it was sent.';
  else if (result?.outcome === 'cancelled') quiet = 'Not sent. The share options were closed without choosing an app.';
  else if (result?.outcome === 'downloading' && ready)
    quiet = `Your browser is saving “${ready.file.name}”. You’ll find it with your other downloads.`;

  const problem =
    state.step === 'failed'
      ? `The ${name} couldn’t be made. Nothing was shared or saved. If trying again doesn’t work, close Say It Once completely, open it again and come back to this report.`
      : result?.outcome === 'failed'
        ? `${result.reason} Nothing was shared or saved.`
        : null;

  const making = state.step === 'making';
  const missing = ready?.missing ?? [];
  return (
    <div className="send-report">
      <div className="button-row">
        <Button variant={ready ? 'secondary' : 'primary'} onPress={() => void make('pdf')} isDisabled={making}>
          {state.step === 'failed' && state.kind === 'pdf' ? 'Try making the PDF again' : 'Make a PDF'}
        </Button>
        <Button onPress={() => void make('zip')} isDisabled={making}>
          {state.step === 'failed' && state.kind === 'zip' ? 'Try making the zip file again' : 'Make a zip file'}
        </Button>
      </div>
      <p className="field-hint">
        A zip file holds the PDF, a copy that works well with screen readers
        {attachments === 1 ? ', and the letter or photo it refers to' : attachments > 1 ? `, and the ${attachments} letters and photos it refers to` : ''}.
      </p>

      {ready && (
        <div className="button-row">
          {share && (
            <Button variant="primary" autoFocus onPress={() => void deliver(ready, 'share')}>
              {`Share the ${name}`}
            </Button>
          )}
          {download && (
            <Button variant={share ? 'secondary' : 'primary'} autoFocus={!share} onPress={() => void deliver(ready, 'download')}>
              {`Save the ${name} to this device`}
            </Button>
          )}
        </div>
      )}
      {missing.length > 0 && (
        <p className="notice notice-info">
          {missing.length === 1
            ? `The file for ${missing[0]} wasn’t found on this device, so it isn’t in the zip. The report still lists it.`
            : `The files for ${missing.join(', ')} weren’t found on this device, so they aren’t in the zip. The report still lists them.`}
        </p>
      )}

      {/* Both live regions stay in the page, so screen readers hear every change. */}
      <p role="status" className="save-status-quiet">
        {quiet}
      </p>
      <div role="alert">
        {problem && !dismissed && (
          <div className="notice notice-error">
            <p className="notice-title">Not sent</p>
            <p>{problem}</p>
            <Button variant="secondary" onPress={() => setDismissed(true)}>
              Dismiss this message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
