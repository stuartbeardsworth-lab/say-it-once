// "Rather talk than type?": help for speaking instead of typing with the
// phone keyboard's own microphone. Say It Once has no microphone of its own
// (decision Q8: in a web app the recording would go to Google or Apple).
//
// Kept short for someone exhausted or in shock: one sentence first, then
// only the steps for their kind of phone. Turning the microphone on, and
// other phones, are folded away. A fold-out rather than a dialog, because
// most writing boxes are already in a dialog.

export type Phone = 'iphone' | 'samsung' | 'android' | 'other';

/** A best guess from the browser. It only chooses which steps come first; every phone's steps stay available. */
export function detectPhone(userAgent: string, maxTouchPoints = 0): Phone {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iphone';
  // iPads say they're a Mac, but a Mac has no touch screen.
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'iphone';
  if (/SamsungBrowser|SM-[A-Z0-9]/.test(userAgent)) return 'samsung';
  if (/Android/.test(userAgent)) return 'android';
  return 'other';
}

interface PhoneSteps {
  name: string;
  where: string;
  turnOn: string;
}

const steps: Record<Exclude<Phone, 'other'>, PhoneSteps> = {
  iphone: {
    name: 'iPhone or iPad',
    where: 'On an iPhone it’s at the bottom right, or just below the keyboard.',
    turnOn: 'Open Settings, then General, then Keyboard, and turn on Dictation.',
  },
  android: {
    name: 'Android phone',
    where: 'On most Android phones it’s at the top right of the keyboard.',
    turnOn: 'Open Settings, search for Gboard, choose Voice typing and turn it on.',
  },
  samsung: {
    name: 'Samsung phone',
    where:
      'On most Samsung phones it’s at the bottom left, under the keys. If it isn’t there, look in the row above the keys, or tap the three dots in that row.',
    turnOn: 'Open Settings, search for Samsung Keyboard, and turn on voice input.',
  },
};

const notThis: Record<Phone, string> = {
  iphone: 'Not an iPhone?',
  samsung: 'Not a Samsung phone?',
  android: 'A different phone?',
  other: 'Steps for each phone',
};

function currentPhone(): Phone {
  if (typeof navigator === 'undefined') return 'other';
  return detectPhone(navigator.userAgent, navigator.maxTouchPoints);
}

export function MicHelp({ phone = currentPhone() }: { phone?: Phone }) {
  const mine = phone === 'other' ? undefined : steps[phone];
  const others = (Object.keys(steps) as (keyof typeof steps)[]).filter((p) => p !== phone);
  return (
    <details className="mic-help">
      <summary>Rather talk than type?</summary>
      <div className="mic-help-body">
        <p>
          <strong>Tap in the box, then tap the microphone on your keyboard.</strong>
        </p>
        {mine && <p>{mine.where}</p>}
        <p>Speak, then tap it again to stop. Mistakes don’t matter.</p>

        {mine && (
          <details className="mic-help-more">
            <summary>Still can’t see it?</summary>
            <p>{mine.turnOn}</p>
          </details>
        )}

        <details className="mic-help-more">
          <summary>{notThis[phone]}</summary>
          {others.map((p) => (
            <div key={p}>
              <h3>{steps[p].name}</h3>
              <p>{steps[p].where}</p>
              <p>If it’s not there: {lowerFirst(steps[p].turnOn)}</p>
            </div>
          ))}
        </details>
      </div>
    </details>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
