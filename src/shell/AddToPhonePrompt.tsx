import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { RouteLink } from '../router';
import { useStore } from '../store/StoreContext';

// "Keep Say It Once on your phone" on Home, with Not now. Hidden once
// dismissed on this device, and when already opened from the home screen.
// Home renders it when useAddToPhone() says 'prompt'.

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Whether Home shows the "Keep Say It Once on your phone" box:
 * 'prompt' while it's showing, 'dismissed' after Not now, 'installed' when
 * opened from the home screen, and 'loading' until the saved choice is read.
 * Home shows its Add to phone link only when 'dismissed', so the two never
 * appear together, and neither shows once it's installed.
 */
export type AddToPhoneState = 'loading' | 'prompt' | 'dismissed' | 'installed';

export function useAddToPhone(): { state: AddToPhoneState; dismiss: () => void } {
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

  const state: AddToPhoneState = isStandalone()
    ? 'installed'
    : dismissed === null
      ? 'loading'
      : dismissed
        ? 'dismissed'
        : 'prompt';
  return {
    state,
    dismiss: () => {
      setDismissed(true);
      // Remembering "Not now" is a convenience; if it can't be saved, the
      // prompt simply shows again next time.
      void store.setPreference('addToPhoneDismissed', true).catch(() => undefined);
    },
  };
}

export function AddToPhonePrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <aside aria-labelledby="add-to-phone-title" className="notice notice-info">
      <p className="notice-title" id="add-to-phone-title">
        Keep Say It Once on your phone
      </p>
      <p>
        Put it on your home screen so it’s one tap away.{' '}
        <RouteLink to="add-to-phone">See how, and one thing to know first</RouteLink>
      </p>
      <Button onPress={onDismiss}>Not now</Button>
    </aside>
  );
}
