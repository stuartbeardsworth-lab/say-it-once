import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { RouteLink } from '../router';
import { useStore } from '../store/StoreContext';

// "Keep Say It Once on your phone" on Home, with Not now. Hidden once
// dismissed on this device, and when already opened from the home screen.

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function AddToPhonePrompt() {
  const { store, status } = useStore();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    if (status.kind === 'opening') return;
    let current = true;
    store.getPreference<boolean>('addToPhoneDismissed').then(
      (v) => {
        if (current) setDismissed(v === true);
      },
      () => {
        if (current) setDismissed(false);
      },
    );
    return () => {
      current = false;
    };
  }, [store, status.kind]);

  if (dismissed !== false || isStandalone()) return null;
  return (
    <aside aria-labelledby="add-to-phone-title" className="notice notice-info">
      <p className="notice-title" id="add-to-phone-title">
        Keep Say It Once on your phone
      </p>
      <p>
        Put it on your home screen so it’s one tap away. <RouteLink to="add-to-phone">See how, and one thing to know first</RouteLink>
      </p>
      <Button
        onPress={() => {
          setDismissed(true);
          // Remembering "Not now" is a convenience; if it can't be saved, the
          // prompt simply shows again next time.
          void store.setPreference('addToPhoneDismissed', true).catch(() => undefined);
        }}
      >
        Not now
      </Button>
    </aside>
  );
}
