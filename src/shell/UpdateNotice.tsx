import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../components/Button';

// Registers the service worker that keeps the app on this device for use
// offline. When a new version has been downloaded, it waits: this notice
// offers it, and nothing changes until the person chooses. Their record is
// untouched either way, since it lives in the database, not in the app's files.

export function UpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="notice notice-info" role="status">
      <p className="notice-title">A new version of Say It Once is ready</p>
      <p>Your record stays exactly as it is. Finish anything you’re writing first.</p>
      <div className="button-row">
        <Button variant="primary" onPress={() => void updateServiceWorker(true)}>
          Use the new version
        </Button>
        <Button onPress={() => setNeedRefresh(false)}>Not now</Button>
      </div>
    </div>
  );
}
