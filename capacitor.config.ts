import type { CapacitorConfig } from '@capacitor/cli';

// Wraps the built web app (dist/) as an iPhone and Android app. The same
// src/ runs on the Netlify site and inside both apps; everything that has to
// behave differently goes through src/platform/.
//
// Nothing is loaded from the network: `server` deliberately has no `url`, so
// the app runs entirely from the files bundled inside it. That keeps the
// promise in CLAUDE.md — local-first, offline, no third-party scripts — and
// means the app works with no signal, exactly like the home-screen version.

const config: CapacitorConfig = {
  // CHANGE BEFORE THE FIRST STORE UPLOAD. The App Store and Play Store tie a
  // listing to this id for ever; it can't be changed afterwards without
  // starting a new listing. Set it to the owner's own domain reversed once
  // the web address is bought (docs/architecture.md), e.g. 'uk.sayitonce.app'.
  appId: 'uk.sayitonce.app',
  appName: 'Say It Once',
  webDir: 'dist',
  // Cream, so the moment before the app paints matches the app itself
  // rather than flashing white.
  backgroundColor: '#fbf8f5',
  android: {
    // No plain http, ever.
    allowMixedContent: false,
  },
  ios: {
    // The app manages its own safe-area padding (see styles.css), so the
    // web view fills the screen and the navy header runs under the notch.
    contentInset: 'never',
    backgroundColor: '#fbf8f5',
  },
  plugins: {
    CapacitorHttp: { enabled: false },
  },
};

export default config;
