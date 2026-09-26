import { Button } from '../components/Button';
import { RouteLink } from '../router';
import { useRecordId, useStore } from '../store/StoreContext';
import { useLiveQuery } from '../store/useLiveQuery';

// A quiet suggestion on Home to save a backup (docs/spec.md, "Reminder"):
// once the record has real content, and no backup has been saved from this
// device in three weeks. "Not now" hides it for a week.

const enoughEntries = 10;
const day = 24 * 60 * 60 * 1000;

export function BackupReminder() {
  const { store } = useStore();
  const recordId = useRecordId();
  const show = useLiveQuery(
    async () => {
      if (!recordId) return false;
      const [entries, last, hiddenUntil] = await Promise.all([
        store.countItems(recordId),
        store.lastBackupAt(),
        store.getPreference<string>('backupReminderHiddenUntil'),
      ]);
      const now = Date.now();
      if (hiddenUntil && Date.parse(hiddenUntil) > now) return false;
      // countItems includes the record itself.
      return entries - 1 >= enoughEntries && (!last || now - Date.parse(last) > 21 * day);
    },
    `backup-reminder:${recordId ?? ''}`,
  );

  if (!show) return null;
  return (
    <aside aria-labelledby="backup-reminder-title" className="notice">
      <p className="notice-title" id="backup-reminder-title">
        Keep a copy of your record safe
      </p>
      <p>
        Your record is only on this device. <RouteLink to="privacy">Save a backup copy</RouteLink> so you can bring it back
        if this phone is lost or its data is cleared.
      </p>
      <Button
        onPress={() => {
          // Remembering "Not now" is a convenience; if it can't be saved, the reminder simply shows again.
          void store
            .setPreference('backupReminderHiddenUntil', new Date(Date.now() + 7 * day).toISOString())
            .catch(() => undefined);
        }}
      >
        Not now
      </Button>
    </aside>
  );
}
