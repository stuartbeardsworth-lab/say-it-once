# Say It Once: a note for a developer

Thank you for taking a look. This page says what Say It Once is, how to run
it, and what I'd like you to check.

## What it is

Say It Once is a free record-keeping app for people in the UK recovering from
serious injury or illness. They record what happened, how it affects them,
appointments, treatment, costs, letters and contacts. They can then make a
report (PDF, or a zip with the letters) for a solicitor, employer, the DWP or
a doctor.

- It's a web app that can be added to the phone's home screen (a PWA). It
  works offline.
- Everything stays on the device, in the browser's IndexedDB. There is no
  server, no account, no analytics and no third-party scripts.
- To move a record to another device, people save a backup file (which can
  be locked with a password) and restore it on the new device.
- Live site: https://say-it-once-home.netlify.app (hosted free on Netlify,
  deployed from `main`).
- Users are often in pain, exhausted or living with the effects of a brain
  injury, so the wording is short and calm, and accessibility matters
  (target WCAG 2.2 AA).

## Read first

| File | What it tells you |
| --- | --- |
| `CLAUDE.md` | The project rules and every decision made, with the reasons. Start here. |
| `docs/spec.md` | What the app does |
| `docs/architecture.md` | How it's built: storage, the privacy filter, reports, security |
| `docs/play-store.md` | The plan for Google Play |
| `docs/testers.md` | What testers are told |
| `docs/crypto-review-brief.md` | Only if you're checking the encryption |

## Running it

You need Node.js 22 (see `.nvmrc`).

```
npm install
npm run dev          # the app at http://localhost:5173
npm run typecheck
npm run lint
npm test             # unit tests (Vitest)
npx playwright install
npm run test:e2e     # browser tests (Playwright with axe), Chromium and WebKit
```

The code is TypeScript (strict), React, Vite, React Aria Components and Dexie.
Reports use pdfmake and fflate. Locked backups use libsodium.

`server/` holds sync server code that is **not in use**. Sync is paused
because it would need paid hosting. Its tests need PostgreSQL 16; see
`docs/server.md`. You can ignore it unless you're interested.

## What I'd like checked

1. **It builds and the tests pass** on your computer, using the commands
   above.
2. **Google Play.** The plan is a Trusted Web Activity made with PWABuilder
   that opens the live site (`docs/play-store.md`). Is that sound? Could you
   help make the Android package? PWABuilder produces a Digital Asset Links
   file (`assetlinks.json`); please send it to me so it can be added at
   `public/.well-known/assetlinks.json`.
3. **Privacy.** Entries marked "Keep this private" must never appear in a
   report, PDF or zip. Everything shared goes through one function,
   `toShareable` in `src/shareable/toShareable.ts`, which is tested with
   property-based tests (`src/shareable/privacy.property.test.tsx`). Does it
   hold up? The person's own backup is the one deliberate exception: it holds
   everything, so nothing is lost on restore.
4. **Saving.** A save either works or the person is told it didn't. The app
   never falls back to keeping things in memory. Can you find a way a save
   could seem to work and not?
5. **Anything else that worries you**, in plain words: security, data loss,
   accessibility, or things that will be hard to maintain.

## Please

- **Don't put real health information into the app.** Use the made-up
  example record (Help, then "Load the example record").
- **Explain before changing anything.** Suggest changes in a pull request,
  not straight on `main`. CLAUDE.md lists the tools and libraries the
  project allows; adding others is my decision, so please say why first.
- **Keep the repository private** and don't share the code without asking.

When you're done, a short written list of what you found is all I need,
most serious first.
