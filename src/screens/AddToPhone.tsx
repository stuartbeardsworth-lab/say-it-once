import { PageTop } from '../shell/PageTop';

// How to put Say It Once on the home screen (docs/spec.md, "Install
// prompts"), with the storage split stated plainly
// (docs/architecture.md, "The iOS transition").

export function AddToPhone() {
  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Keep Say It Once on your phone</h1>
      <p>Adding it to your home screen puts it one tap away, like an app.</p>

      <div className="notice notice-info">
        <p className="notice-title">One thing to know first, on an iPhone</p>
        <p>
          The home screen icon keeps its own separate record, so anything you’ve already written in Safari won’t be there
          at first.
        </p>
        <p>
          To bring it across: in Safari, go to Privacy &amp; backup and save a backup. Then open the new icon, go to
          Privacy &amp; backup, and choose that backup file.
        </p>
      </div>

      <h2>iPhone or iPad (Safari)</h2>
      <ol>
        <li>Tap the Share button (a square with an arrow pointing up).</li>
        <li>Scroll down and tap “Add to Home Screen”.</li>
        <li>Tap “Add”.</li>
      </ol>
      <p>
        If you use Say It Once in Safari rather than from the home screen, open it at least once a week. Safari can clear
        a website’s data if it hasn’t been visited for about seven days.
      </p>

      <h2>Android (Chrome)</h2>
      <ol>
        <li>Tap the menu (three dots, top right).</li>
        <li>Tap “Add to Home screen” or “Install app”.</li>
        <li>Tap “Add”.</li>
      </ol>

      <h2>Samsung Internet</h2>
      <p>
        Tap the menu (three lines), then “Add page to”, then “Home screen”. If your phone shows a warning about installing
        the app, don’t use the install option: keep using Say It Once in Samsung Internet, where your record already is.
      </p>

      <h2>Other browsers</h2>
      <p>Look in the browser’s menu for “Add to Home screen” or “Bookmark”.</p>
    </>
  );
}
