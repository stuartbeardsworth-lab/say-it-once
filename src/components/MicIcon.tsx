import type { Phone } from './MicHelp';

// A picture of the keyboard's microphone key, so someone who has never used
// it knows what to look for. It's a picture only, never a button: Say It Once
// can't record (decision Q8).
//
// Android: the 'mic' icon from Google's Material Icons, the one Gboard uses,
// Copyright Google LLC, Apache License 2.0 (src/assets/icons/material-icons-LICENSE.txt).
// iPhone and Samsung: our own drawings in the style of their keyboards'
// microphone. Apple's and Samsung's own icons can't be used in a web app.

const label = 'a microphone symbol';

export function MicIcon({ phone }: { phone: Phone }) {
  if (phone === 'android' || phone === 'other') {
    return (
      <svg className="mic-icon mic-icon-filled" viewBox="0 0 24 24" role="img" aria-label={label}>
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
      </svg>
    );
  }
  return (
    <svg className="mic-icon" viewBox="0 0 24 24" role="img" aria-label={label}>
      <rect x="9" y="2.75" width="6" height="11.5" rx="3" />
      <path d="M5.75 11a6.25 6.25 0 0 0 12.5 0" />
      <path d="M12 17.25V21" />
      {phone === 'samsung' && <path d="M9 21h6" />}
    </svg>
  );
}
