import { useState } from 'react';
import { Button } from '../../components/Button';
import { makePdf } from '../../reports/makePdf';
import type { Report } from '../../reports/model';
import { safeFileName } from './deliver';
import { DeliverFile } from './DeliverFile';

// Make a PDF or a zip of the report, then share or save it. Two taps on
// purpose: phones only open the share options straight after a tap, and
// making the file can take a few seconds, so it is made first and shared
// second.

type Kind = 'pdf' | 'zip';

const words: Record<Kind, { name: string; making: string }> = {
  pdf: { name: 'PDF', making: 'Making the PDF…' },
  zip: { name: 'zip file', making: 'Making the zip file…' },
};

type Ready = { step: 'ready'; kind: Kind; file: File; missing: string[] };
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
      setState({ step: 'ready', kind, file, missing });
    } catch {
      setState({ step: 'failed', kind });
    }
  }

  const ready = state.step === 'ready' ? state : null;
  const name = state.step === 'start' ? '' : words[state.kind].name;

  let quiet = '';
  if (state.step === 'making') quiet = words[state.kind].making;
  else if (ready) quiet = `Your ${name} is ready (${size(ready.file.size)}).`;

  const problem =
    state.step === 'failed'
      ? `The ${name} couldn’t be made. Nothing was shared or saved. If trying again doesn’t work, close Say It Once completely, open it again and come back to this report.`
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
        // Unmounted while the next file is made, so each new file starts with no result shown.
        <DeliverFile file={ready.file} name={name} title={report.title} onSent={() => onSent(report.itemIds)} />
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
