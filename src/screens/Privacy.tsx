import { DeviceOnlyBanner } from '../shell/DeviceOnlyBanner';
import { PageTop } from '../shell/PageTop';
import { StorageSpace } from '../shell/StorageSpace';

export function Privacy() {
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

      <h2>Backup and deleting</h2>
      <p>Saving a backup copy and deleting your record will be added here in a later stage of the build.</p>
    </>
  );
}
