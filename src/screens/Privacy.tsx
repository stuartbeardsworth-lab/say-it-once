import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BackupSection } from '../features/backup/BackupSection';
import { RestoreSection } from '../features/backup/RestoreSection';
import { navigate, RouteLink } from '../router';
import { DeviceOnlyBanner } from '../shell/DeviceOnlyBanner';
import { useStore } from '../store/StoreContext';
import { PageTop } from '../shell/PageTop';
import { StorageSpace } from '../shell/StorageSpace';

export function Privacy() {
  const { store, reopen } = useStore();
  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Privacy &amp; backup</h1>
      <DeviceOnlyBanner />

      <h2>Where is my record?</h2>
      <p>
        Your record is kept in this browser, on this device. It is not sent anywhere. There is no account and no
        one at Say It Once can see it.
      </p>

      <h2>Who can read it?</h2>
      <p>
        Anyone who can open this device and this browser can read your record. Keeping your phone locked keeps
        your record private.
      </p>

      <h2>Space on this device</h2>
      <StorageSpace />

      <BackupSection />
      <RestoreSection />

      <h2>Deleting</h2>
      <p>
        To delete one record, go to <RouteLink to="records">My records</RouteLink>.
      </p>
      <ConfirmDialog
        trigger={<Button variant="danger">Delete everything on this device</Button>}
        title="Delete everything on this device?"
        confirmLabel="Delete everything"
        pendingLabel="Deleting…"
        onConfirm={async () => {
          await store.deleteEverything();
          reopen();
          navigate('home');
        }}
      >
        <p>
          Every record, entry, letter and photo in Say It Once on this device will be deleted, along with your
          settings. This can’t be undone.
        </p>
        <p>Backups you’ve saved, and PDFs you’ve shared, aren’t affected. If you want to keep your record, make a backup first.</p>
      </ConfirmDialog>
    </>
  );
}
