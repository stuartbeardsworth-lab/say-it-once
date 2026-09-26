// Asks the browser to look for a new version of Say It Once: when the app is
// opened, whenever it comes back onto the screen, and every hour while it's
// open. Browsers only check by themselves when a page is loaded, and a
// home-screen app can stay open in the background for days, so without this
// people can be left on an old version.
//
// Finding a new version never switches to it: UpdateNotice offers it, and
// nothing changes until the person chooses.

const hour = 60 * 60 * 1000;

export function watchForUpdates(
  registration: { update(): Promise<unknown> },
  doc: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document,
  every = hour,
): () => void {
  const check = () => {
    // Offline or a brief network error: the next check will try again.
    registration.update().catch(() => undefined);
  };
  const onVisible = () => {
    if (doc.visibilityState === 'visible') check();
  };
  check();
  doc.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(check, every);
  return () => {
    doc.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
  };
}
