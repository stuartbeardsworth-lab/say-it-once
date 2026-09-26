// "Can't find the microphone?": step-by-step help for speaking instead of
// typing with the phone keyboard's own microphone. Say It Once has no
// microphone of its own (decision Q8: in a web app the recording would go to
// Google or Apple), so this makes the keyboard's one easy to find. A fold-out
// section rather than a dialog, because most writing boxes are already in a
// dialog.

export function MicHelp() {
  return (
    <details className="mic-help">
      <summary>Can’t find the microphone?</summary>
      <div className="mic-help-body">
        <p>You can speak instead of typing, using the microphone on your phone’s keyboard.</p>

        <h3>iPhone or iPad</h3>
        <ol>
          <li>Tap in the box so the keyboard opens.</li>
          <li>Tap the microphone. It’s at the bottom right of the keyboard, or just below it.</li>
          <li>Speak. Tap the microphone again when you’ve finished.</li>
        </ol>
        <p>
          No microphone? Open <strong>Settings</strong>, then <strong>General</strong>, then{' '}
          <strong>Keyboard</strong>, and turn on <strong>Dictation</strong>.
        </p>

        <h3>Android phone with the Google keyboard (Gboard)</h3>
        <ol>
          <li>Tap in the box so the keyboard opens.</li>
          <li>Tap the microphone at the top right of the keyboard.</li>
          <li>Speak. Tap the microphone again when you’ve finished.</li>
        </ol>
        <p>
          No microphone? Open the phone’s <strong>Settings</strong>, search for <strong>Gboard</strong>, choose{' '}
          <strong>Voice typing</strong>, and turn it on.
        </p>

        <h3>Samsung phone</h3>
        <ol>
          <li>Tap in the box so the keyboard opens.</li>
          <li>
            Tap the microphone in the row above the keys. If you can’t see it, tap the three dots there to find
            it.
          </li>
          <li>Speak. Tap the microphone again when you’ve finished.</li>
        </ol>
        <p>
          No microphone? Open the phone’s <strong>Settings</strong>, search for <strong>Samsung Keyboard</strong>,
          and turn on voice input.
        </p>

        <h3>Good to know</h3>
        <ul>
          <li>Say “full stop”, “comma” or “new line” to add them.</li>
          <li>Mistakes don’t matter. You can tidy the words later, or leave them.</li>
          <li>
            Your phone’s keyboard turns your voice into words. Some phones do this on the phone; others use Apple’s
            or Google’s services. Say It Once never receives the recording.
          </li>
        </ul>
      </div>
    </details>
  );
}
