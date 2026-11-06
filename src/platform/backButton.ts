// The Android hardware Back button.
//
// Android sends Back to the app rather than to the page, so without this it
// closes Say It Once from any screen. It should do what the app's own Back
// does: close an open dialog first, then step back a screen, and only leave
// the app from the top level.
//
// Nothing happens on iPhone or on the website: the listener is only added
// inside a phone app.

import { isNative } from './index';
import { canGoBack, goBack } from '../router';

/** Closes the top dialog, if one is open. Returns true when it did. */
function closeOpenDialog(): boolean {
  // React Aria dialogs close on Escape and put focus back where it was,
  // so this reuses the behaviour the keyboard already has.
  const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
  if (!dialog) return false;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return true;
}

export function startAndroidBackButton(): () => void {
  if (!isNative()) return () => undefined;

  let remove: (() => void) | undefined;
  void (async () => {
    const { App } = await import('@capacitor/app');
    const handle = await App.addListener('backButton', () => {
      if (closeOpenDialog()) return;
      if (canGoBack()) goBack();
      else void App.exitApp();
    });
    remove = () => void handle.remove();
  })();

  return () => remove?.();
}
