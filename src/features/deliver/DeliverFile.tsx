import { useState } from 'react';
import { Button } from '../../components/Button';
import { canShareFile, downloadFile, isAppleHomeScreenApp, shareFile, type DeliveryResult } from './deliver';

// Share or save a finished file, and say only what is known about what
// happened (see deliver.ts). Used for reports and for backups.

export interface DeliverFileProps {
  file: File;
  /** What the file is called in the buttons, e.g. "PDF" or "backup". */
  name: string;
  /** The title given to the share options. */
  title: string;
  /** Called once the file has left the app: passed to an app, or handed to the browser to save. */
  onSent: () => void;
}

export function DeliverFile({ file, name, title, onSent }: DeliverFileProps) {
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const share = canShareFile(file);
  // A home-screen app on an iPhone saves through the share options instead.
  const download = !(share && isAppleHomeScreenApp());

  async function deliver(how: 'share' | 'download') {
    setDismissed(false);
    const next = how === 'share' ? await shareFile(file, title) : downloadFile(file);
    setResult(next);
    if (next.outcome === 'shared' || next.outcome === 'downloading') onSent();
  }

  const quiet =
    result?.outcome === 'shared'
      ? 'Passed to the app you chose. Check there that it was sent or saved.'
      : result?.outcome === 'cancelled'
        ? 'Not sent. The share options were closed without choosing an app.'
        : result?.outcome === 'downloading'
          ? `Your browser is saving “${file.name}”. You’ll find it with your other downloads.`
          : '';

  return (
    <>
      <div className="button-row">
        {share && (
          <Button variant="primary" autoFocus onPress={() => void deliver('share')}>
            {`Share the ${name}`}
          </Button>
        )}
        {download && (
          <Button variant={share ? 'secondary' : 'primary'} autoFocus={!share} onPress={() => void deliver('download')}>
            {`Save the ${name} to this device`}
          </Button>
        )}
      </div>
      {/* Both live regions stay in the page, so screen readers hear every change. */}
      <p role="status" className="save-status-quiet">
        {quiet}
      </p>
      <div role="alert">
        {result?.outcome === 'failed' && !dismissed && (
          <div className="notice notice-error">
            <p className="notice-title">Not sent</p>
            <p>{result.reason} Nothing was shared or saved.</p>
            <Button variant="secondary" onPress={() => setDismissed(true)}>
              Dismiss this message
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
