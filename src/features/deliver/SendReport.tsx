import { useState } from 'react';
import { Button } from '../../components/Button';
import { makePdf } from '../../reports/makePdf';
import type { Report } from '../../reports/model';
import { canShareFile, downloadFile, isAppleHomeScreenApp, safeFileName, shareFile, type DeliveryResult } from './deliver';

// Make a PDF of the report, then share or save it. Two taps on purpose:
// phones only open the share options straight after a tap, and making the
// PDF can take a few seconds, so the file is made first and shared second.

type State =
  | { step: 'start' }
  | { step: 'making' }
  | { step: 'ready'; file: File; result: DeliveryResult | null }
  | { step: 'failed' };

export interface SendReportProps {
  report: Report;
  /** Called once the file has left the app, to note which entries were in it. */
  onSent: (itemIds: string[]) => void;
}

export function SendReport({ report, onSent }: SendReportProps) {
  const [state, setState] = useState<State>({ step: 'start' });
  const [dismissed, setDismissed] = useState(false);

  async function make() {
    setState({ step: 'making' });
    setDismissed(false);
    try {
      const blob = await makePdf(report);
      const name = `${safeFileName('Say It Once', report.title, report.recordName)}.pdf`;
      setState({ step: 'ready', file: new File([blob], name, { type: 'application/pdf' }), result: null });
    } catch {
      setState({ step: 'failed' });
    }
  }

  async function deliver(file: File, how: 'share' | 'download') {
    setDismissed(false);
    const result = how === 'share' ? await shareFile(file, report.title) : downloadFile(file);
    setState({ step: 'ready', file, result });
    if (result.outcome === 'shared' || result.outcome === 'downloading') onSent(report.itemIds);
  }

  const ready = state.step === 'ready' ? state : null;
  const result = ready?.result ?? null;
  const share = ready ? canShareFile(ready.file) : false;
  // A home-screen app on an iPhone saves through the share options instead.
  const download = ready ? !(share && isAppleHomeScreenApp()) : false;

  let quiet = '';
  if (state.step === 'making') quiet = 'Making the PDF…';
  else if (ready && !result) quiet = 'Your PDF is ready.';
  else if (result?.outcome === 'shared') quiet = 'Passed to the app you chose. Check there that it was sent.';
  else if (result?.outcome === 'cancelled') quiet = 'Not sent. The share options were closed without choosing an app.';
  else if (result?.outcome === 'downloading' && ready)
    quiet = `Your browser is saving “${ready.file.name}”. You’ll find it with your other downloads.`;

  const problem =
    state.step === 'failed'
      ? 'The PDF couldn’t be made. Nothing was shared or saved. If trying again doesn’t work, close Say It Once completely, open it again and come back to this report.'
      : result?.outcome === 'failed'
        ? `${result.reason} Nothing was shared or saved.`
        : null;

  return (
    <div className="send-report">
      <div className="button-row">
        {(state.step === 'start' || state.step === 'making' || state.step === 'failed') && (
          <Button variant="primary" onPress={() => void make()} isDisabled={state.step === 'making'}>
            {state.step === 'making' ? 'Making the PDF…' : state.step === 'failed' ? 'Try making the PDF again' : 'Make a PDF'}
          </Button>
        )}
        {ready && share && (
          <Button variant="primary" autoFocus onPress={() => void deliver(ready.file, 'share')}>
            Share the PDF
          </Button>
        )}
        {ready && download && (
          <Button variant={share ? 'secondary' : 'primary'} autoFocus={!share} onPress={() => void deliver(ready.file, 'download')}>
            Save the PDF to this device
          </Button>
        )}
      </div>
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
