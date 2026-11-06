# The iPhone and Android apps

Say It Once is one codebase in three places: the website, a home-screen web
app, and the App Store and Play Store apps. The stores' apps are the same
`src/` wrapped with [Capacitor](https://capacitorjs.com/), which puts the
built `dist/` folder inside a native shell and gives it the phone's own
share sheet and Back button.

Nothing is loaded over the network. `capacitor.config.ts` deliberately has no
`server.url`, so the app runs entirely from files bundled inside it: the
promises in `CLAUDE.md` (local-first, offline, no third-party scripts, nothing
leaves the device) hold exactly as they do on the website.

## Setting up, once

You need Xcode (iPhone) and Android Studio (Android), plus CocoaPods for
iPhone: `sudo gem install cocoapods`, or `brew install cocoapods`.

```sh
npm install
npm run build:native     # makes dist/ without the service worker
npx cap add ios
npx cap add android
```

`cap add` writes the `ios/` and `android/` projects. They are committed to
the repository, so this is only done once; everything generated inside them
afterwards is ignored (see `.gitignore`).

## Running it on a phone

```sh
npm run cap:ios        # builds, copies into ios/, opens Xcode
npm run cap:android    # builds, copies into android/, opens Android Studio
```

Then press Run in Xcode or Android Studio, with a simulator or a real phone
selected. After any change to `src/`, run the same command again — the web
assets are copied in at that point, not watched live.

`npm run cap:sync` does the build and copy without opening anything.

## What is different inside an app

Everything that can't behave the same goes through `src/platform/`, so the
website is never changed by accident. `src/platform/platform.test.ts` holds
tests that prove the web path is still taken in a browser.

| | Website | Phone app |
| --- | --- | --- |
| Handing over a file | `navigator.share`, or a download | The phone's share sheet, through a cache file that is deleted straight after (`platform/shareNative.ts`) |
| "Save to this device" | A download link | Hidden; saving goes through the share sheet, as it already does on an iPhone home-screen app |
| Updates | Service worker, "Use the new version" | The App Store and Play Store; the service worker is switched off (`disable: native` in `vite.config.ts`) |
| "Keep Say It Once on your phone" | Shown | Hidden; it is already an app |
| Back | The browser's Back | Android's hardware Back closes a dialog, then steps back a screen, then leaves the app (`platform/backButton.ts`) |
| Safe areas | Nothing to do | The header runs under the notch and the footer under the home indicator; `env(safe-area-inset-*)` adds the margins back |

The record itself is unchanged: the same Dexie database, the same privacy
filter, the same reports, the same backup files.

## Before the first upload to a store

- **Set the app id.** `appId` in `capacitor.config.ts` is a placeholder
  (`uk.sayitonce.app`). Both stores tie a listing to it for ever, so it has
  to be the real one — the owner's domain reversed — before the first upload.
- **Icons and splash screens.** Generated from the app's own logo; not done
  yet.
- **Apple Developer Program**, £79 a year, and a Google Play developer
  account, $25 once. Neither is needed to run the app on your own phone.
- **Privacy answers.** Both stores ask what the app collects. The answer is
  nothing: no analytics, no accounts, no network calls. `public/privacy-policy.html`
  is the page to point them at.
- The Play Store listing described in `docs/play-store.md` was planned as a
  Trusted Web Activity. That is superseded by this; the rest of that
  document (the store text, the images, keeping the site public) still holds.
