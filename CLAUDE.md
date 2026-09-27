# Say It Once — project brief

This file is read by Claude Code at the start of every session. It carries the
decisions already made so they are not re-litigated or forgotten.

## What this is

A rebuild of Say It Once: a record-keeping app for people in the UK recovering
from serious injury or illness. They record what happened, how it affects them,
appointments, treatment, costs, documents and contacts, then produce a Summary,
Evidence Pack or Full Record for a solicitor, employer, the DWP or a doctor.

Users are often in pain, exhausted, grieving or living with cognitive effects of
their injury. Design and write for that: calm, short, forgiving, never alarming.

## Sources of truth

- `docs/spec.md` — what the old app does, its defects, and the Decisions table.
- `docs/architecture.md` — key hierarchy, sync, data model, privacy filter,
  report pipeline, threat model, Decisions, and the Build plan.
- `legacy/` (if present) — the old single-file app. Read it as a specification
  only. **Never port or copy its JavaScript.**

If code and these documents disagree, stop and ask which is right.

## How we work

1. Work one stage of the Build plan at a time. At the end of each stage, stop and
   give: what was built, how to run it, what to review, and anything that went
   differently from the plan. Do not start the next stage until the owner says so.
2. Ask when something is unclear rather than inventing an answer.
3. Push back plainly when a request will cause problems later. Explain why.
4. Explain reasoning as you go. The owner is a sole developer who must be able to
   maintain this for years.
5. Keep dependencies to the approved list below. Adding anything else needs a
   stated reason and the owner's agreement.
6. Every change runs type checks, lint and tests before it is called done.

## Non-negotiables

- A save either succeeds or the person is clearly told it did not. Never fall back
  to memory or any other storage, and never show success for a failed save.
- Deleting means deleted everywhere, including files, copies inside snapshots,
  search history and server copies.
- Anything marked "Keep this private" never appears in any output. Enforced in one
  function (`toShareable`), proved by property-based tests. Private is absolute.
  The one exception is the person's own backup (decided 26 September 2026):
  it holds everything, private entries included, and says so.
- Accessibility is a primary requirement: keyboard use, focus management in every
  dialog, screen reader support, and text size that scales the whole app from the
  root. Target WCAG 2.2 AA.
- Local-first and offline. Sync (later stages) is opt-in and end-to-end encrypted;
  the server never sees content.
- Structured data stays structured all the way to the renderer. Never parse text
  to recover structure.
- No analytics, no third-party scripts, no remotely loaded fonts.
- No in-app dictation (decision Q8): suggest the phone keyboard's microphone.
- The app records and organises. It never interprets, scores or advises on health.

## Approved stack

Client: TypeScript (strict), React, Vite, React Aria Components, Dexie.js,
vite-plugin-pwa (Workbox), pdfmake, fflate, libsodium (from stage 7, as
`libsodium-wrappers-sumo`, the build that includes Argon2id).
Server (from stage 8): Node.js LTS, Fastify, PostgreSQL, Kysely, with `pg`
(Kysely's PostgreSQL driver) and `@fastify/cookie` (approved 26 September 2026).
Tests: Vitest, fast-check, Playwright (including WebKit), axe-core.
Development-only tools (approved 25 September 2026; never shipped to users):
ESLint (with typescript-eslint, eslint-plugin-react-hooks, globals),
React Testing Library (react, user-event, jest-dom), jsdom,
@axe-core/playwright, @vitejs/plugin-react, fake-indexeddb (approved 25 September
2026; runs the database code in unit tests without a browser).
Hosting: static client on Netlify for now; server on Hetzner (EU) from stage 8.

Deliberately not used: Next.js or other SSR frameworks, Firebase, Supabase,
Yjs/Automerge, PouchDB/CouchDB, hosted sync products, Kubernetes, GraphQL,
heavy ORMs.

## Stage 1 — Foundations

Deliver:
- Repository set up with TypeScript strict, Vite, React, React Aria Components.
- Scripts: `npm run dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`.
- CI (GitHub Actions) running typecheck, lint, unit tests, Playwright with axe on
  every push.
- A dependency rule in CI: nothing under `src/reports/` may import the local store,
  sync code or raw record types (`dependency-cruiser` or an ESLint
  `no-restricted-imports` rule).
- Accessible building blocks, each with tests: Dialog (focus moves in, is trapped,
  returns on close, Escape closes, labelled by its heading), ConfirmDialog (same,
  used for every delete), TextField and TextArea with label, hint and error
  message wired for screen readers, and a SaveStatus message that stays until
  dismissed when it reports a failure.
- Text size setting that scales the root font size, with all sizes in `rem`.
- App shell: Home and Privacy & backup screens with routing, a skip link, and
  focus moving to the page heading on every navigation.

Done when:
- All scripts pass locally and in CI.
- Playwright plus axe reports no violations on both screens.
- A written keyboard-only walkthrough of both screens and every building block
  passes, and a VoiceOver check has been done on a real iPhone.
- Stop and report back before starting stage 2.

## Decisions made during the build

- 25 September 2026, Stage 3 is built in three parts, each with its own
  preview and checklist: 3a Home, Quick Notes and filing, My records, What
  happened; 3b How it affects me and Keep track; 3c Find, Find support,
  FAQ, How to use, Add to phone.
- FAQ and How to use text is drafted by Claude to describe only what the
  new app does, and reviewed by the owner before release.
- "Listen to this section" is left out for now; phones' own Speak Screen
  and Select to Speak cover it. Reports keep Read aloud (Stage 4).
  (Changed 26 September 2026: "Listen" is back in the header, for people
  who would rather hear a page than read it. See the look and feel entry.)
- Find is plain search plus a few fixed answers computed from structured
  data (money spent, current medication, next appointment). No question
  parsing.
- Find support lists only phone numbers known to be right (999, NHS 111,
  Samaritans 116 123) and links to each organisation's own website. The
  owner checks the list before release.
- Print contact list leaves out private contacts.
- 25 September 2026, Stage 4 is built in two parts: 4a the privacy filter,
  its property tests, purposes and the report model with a reading view;
  4b the full "Use my record" screens and Find's "Use these results".
- Report test records are written by Claude, clearly fictional, and
  reviewed by the owner.
- The reports import rule blocks exactly the store, sync code and raw
  record types (`src/domain/types`, `schema`, `validate`, `blank`).
  Harmless domain helpers (wording lists, dates, money) may be used.
- 26 September 2026, Stage 5 is built in two parts: 5a PDF, sharing or
  saving it, and the home-screen app with offline use; 5b the zip with an
  HTML copy and the attachments.
- Delivery results say only what is known. The share options can report
  that the file was passed to an app, not that it was sent; browsers never
  report that a download finished. So: "Passed to the app you chose",
  "Your browser is saving …", and "Not sent" when the share options are
  closed. Making the PDF and sharing it are two taps, because phones only
  open the share options straight after a tap.
- The service worker and app manifest (vite-plugin-pwa) are added in
  Stage 5, with the icon drawn by `scripts/make-icons.mjs`. A new
  version waits until the person chooses "Use the new version".
- Delete confirmations say when the entry was in a PDF that was shared or
  saved on this device. The note is device-only and deleted with the entry.
- The PDF uses Roboto, which comes with pdfmake, bundled and loaded only
  when the first PDF is made. pdfmake has no types; `src/types/pdfmake.d.ts`
  and `src/reports/pdf.ts` describe the parts used instead of adding a
  types package. The PDF privacy test checks the document description
  handed to pdfmake, since text inside the finished PDF can't be searched.
- The zip holds `report.pdf`, `report.html` (the reading view as one page,
  no scripts, the report's title as its main heading) and
  `attachments/E1-name.ext` for letters. Photos kept with Quick Notes that
  are in the report go in too, as `attachments/P1-photo.ext`, numbered in
  reading order; the report says "See P1" and lists them under Photos,
  matching the old app, which included them. A file that can't be found is
  named on screen, never left out quietly. Files are read and written one
  at a time.
- 26 September 2026, Stage 6 is built in two parts: 6a backup and restore,
  the backup reminder and deleting everything; 6b ready for testers.
- Restore from the app's own backup is built (restore only ever adds
  records; a record already on the device is left out unless the person
  chooses a separate copy). It is also how a record moves from Safari to
  the iPhone home-screen app.
- A backup includes private entries. It is the person's own copy, not an
  output: leaving them out would lose them on restore. The backup is not
  encrypted until Stage 7, and says so on screen and in its manifest.
- The Building blocks page goes in 6b; "Load the example record" moves to
  How to use. There is no feedback link in the app (decided 26 September
  2026): the owner tells testers directly how to reach them, so no personal
  contact details appear in the app. Revisit before a public launch.
- 26 September 2026, Stage 7: the encryption module is `src/crypto/`, built
  and tested but not used by the app until sync (Stage 9). The site's CSP
  adds `'wasm-unsafe-eval'` so libsodium runs as WebAssembly (no other eval).
  The device key is WebCrypto AES-GCM (non-extractable), the one exception to
  "libsodium only". The EFF long word list (suggested passphrases) and the
  SecLists 10,000 most common passwords ship with the app, never fetched.
  Deploy Previews include the review page (with a phone speed check); the
  live site doesn't.
- The independent cryptography review (`docs/crypto-review.md`, brief in
  `docs/crypto-review-brief.md`) is arranged and paid for by the owner. No
  real person's data goes to the server until the reviewer has signed off.
- 26 September 2026, Stage 8 is built in two parts: 8a the server code and
  its tests (in `server/`, run by CI against PostgreSQL 16), and 8b going
  live on Hetzner. The owner buys a web address so the app (`app.`) and the
  server (`api.`) share it: the SameSite=Strict session cookie and the
  sign-in emails both need that. Sign-in codes go through an EU-based email
  provider, chosen in 8b. Encrypted files are stored in the database for
  now; they can move to object storage later without changing the app.
- The server runs TypeScript directly with Node's type stripping (Node
  22.18+), so it has no build step. See `docs/server.md`.
- 26 September 2026, look and feel: the rebuild takes the original app's
  look (the orange-dot speech-bubble logo, colours, fonts, layout, icon)
  from `legacy/`, read as a specification and never copied as code. This is
  a short stage done next, before Stage 8b. Fonts are bundled with the app,
  never loaded from elsewhere, and colours are checked for WCAG 2.2 AA
  contrast.
- Look and feel as built: navy #20433E, cream #FBF8F5, slate, emerald and
  the original orange #E8714A. That orange is too light for text (2.9:1),
  so it is kept for the logo dot, icons and decoration, and a deeper orange
  #B84F2D is used for orange words. The focus outline is navy with an
  orange edge. Manrope (headings) and Inter (text) are bundled as woff2
  files in `src/assets/fonts` with their SIL Open Font Licences, taken from
  the Fontsource packages without adding a dependency. `src/theme.test.ts`
  checks every colour pair the app uses. The old page is kept as
  `legacy/index.html`. Dictation stays out; Home's card wording describes
  only what the new app does.
- 26 September 2026, after the owner's review of the look: "Listen" is in
  the header. It reads the screen's headings, text, labels and summaries
  (up to 60 parts, en-GB voice, slower rate) with the device's own voice,
  with Pause, Carry on and Stop in a bar under the header, and stops on
  moving to another screen. Nothing leaves the device. Per-section Listen
  buttons are not added. Home's "Your record" cards are folded away, as in
  the original, and the "Only on this phone" notice is on Privacy & backup
  only, to keep Home calm.
- 26 September 2026, sync is paused: the owner doesn't want to pay for
  anything, and every remaining stage (8b going live, 9 sync, 10 launch of
  sync) needs a server, a web address and the cryptography review, which
  all cost money. Free hosting was ruled out for health data (mostly US
  companies, databases deleted or servers switched off when idle, no own
  web address). Say It Once stays device-only, free on Netlify, with backup
  and restore to move a record between devices. The server code from 8a
  stays in `server/`, tested in CI, ready if funding is found; then work
  restarts at Stage 8b. Until then, work is limited to the device-only app.
- 26 September 2026, Google Play: the device-only app goes on Google Play as
  a Trusted Web Activity made with PWABuilder by the owner, opening
  `say-it-once-home.netlify.app`. No wrapper code or new dependency in this
  repository. The privacy policy is a plain page, `public/privacy-policy.html`
  (no scripts, so reviewers can read it anywhere), linked from Privacy &
  backup, and kept true to what the app does. Store images are made from the
  app by `scripts/store-images.mjs`. The owner's personal email stays out of
  the app; Google's public contact email is a separate address. Listen uses
  only voices the device reports as built in, so the words aren't sent to an
  online speech service. The guide is `docs/play-store.md`; the Digital
  Asset Links file (`public/.well-known/assetlinks.json`) is added once the
  package exists.
- 26 September 2026, microphone: the owner asked to keep a microphone for
  people who can't find the one on their keyboard. In-app dictation stays
  out (Q8: in a web app the recording goes to Google or Apple, and it would
  make the privacy policy and Play Store answers untrue). Instead a
  fold-out "Can't find the microphone?" under the main writing boxes (What
  happened, Quick Note, an area of How it affects me, and "Anything else
  this has changed") gives one short instruction, then only the steps for
  the person's kind of phone (a best guess from the browser); turning the
  microphone on, and other phones, are folded away (the owner asked that it
  suit someone in trauma). It's `src/components/MicHelp.tsx`,
  shown with `<TextArea micHelp>`, once per screen or dialog.
- 26 September 2026, no list of links at the foot of every screen (the owner
  asked; apps don't usually have one, and the old app hid it on Home). Every
  screen is reached from Home: the task cards, "Your record" (now also Quick
  Notes and My records) and the Help and settings box (plus Building blocks
  in Deploy Previews); other screens have Back and Home. The footer keeps the
  brand line and the version.
- 26 September 2026, updates: the owner's phone stayed on an old version
  after new ones were published. The app now asks the browser to look for a
  new version when it opens, whenever it comes back on screen, and hourly
  (`src/shell/watchForUpdates.ts`); Netlify serves `sw.js` and `index.html`
  with `Cache-Control: no-cache`. Switching still waits for the person to
  choose "Use the new version".
- 27 September 2026, the live site must stay public: Netlify's visitor
  protection ("Team protection") had been switched on for production, so
  only the owner's Netlify account could open it, testers would have seen
  "This site is private", and installed copies couldn't fetch updates. The
  owner turned it off. Keep Visitor access at "No protection" for
  production (see `docs/play-store.md`); the site holds no records.
- 27 September 2026, header: the tagline "No need to relive it." is gone,
  so the logo and "Say It Once" (now larger) are what stand out. Text size
  and Listen look smaller and quieter (smaller icons and labels, fainter
  outline) but keep a 44-pixel tap area for WCAG 2.2 target size and
  shaky hands; their small labels stay, because an icon alone is hard to
  work out.
- 27 September 2026, Home and fold-outs: Home's fold-out is "Look back at
  your record" ("See and change what you've already added"), so it's clear
  it's for going back to entries, while Add something is for new ones.
  Home always shows "Record: <name> · Change" under the title, so people
  know from the start there can be more than one record and which one
  they're adding to; My records suggests renaming "My record". Every
  fold-out (`details.more`) is a bordered box with an arrow, like Home's,
  so it's never mistaken for a heading. "Rather talk than type?" stays
  a small underlined help line.
- 27 September 2026, appointment letters: the appointment form offers "Take
  a photo of the letter" (opens the camera) and "Choose a file", straight
  after the date, as Letters & documents does. The letter is still filed
  in Letters & documents. The app doesn't read the letter to fill in the
  details: that would need an online text-reading service (the letter
  would leave the phone) and would parse text to recover structure.
- 27 September 2026, report branding: every PDF page ends with a small grey
  line "Made with Say It Once · Record it, keep it together, use it when
  you need it" under the page number, and the HTML copy ends with the same
  line (`madeWith` in `src/reports/model.ts`). No logo or colours, so the
  report stays plain evidence; no on/off setting. No web address yet: add
  one once there's a Google Play listing or the owner's own address. The
  PDF font (Roboto) has no arrow, so the line uses commas.
- 27 September 2026, one Help screen: How to use and Questions and answers
  are merged into **Help** (`src/screens/Help.tsx`): Getting started (the
  four steps, Load the example record, Print these steps) then Questions
  and answers with its search. Someone looking for help shouldn't have to
  decide first whether theirs is a "how to" or a "question". `#how-to-use`
  and `#faq` still open Help. Home's links are Help, Add to phone and
  Privacy & backup. Find support stays just under the four tasks, because
  it leads to urgent help. The footer tagline is smaller (0.75rem), on one
  line from 360px wide, and breaks after an arrow when it has to wrap.
- 27 September 2026, Add to phone on Home: the green "Keep Say It Once on
  your phone" box and the Add to phone link never show together. The box
  shows until Not now; then the link appears in Home's links as the way
  back, and focus moves to it. Opened from the home screen, neither shows.
  (`useAddToPhone` in `src/shell/AddToPhonePrompt.tsx`.)
- 27 September 2026, fixes from the end-to-end review:
  - Add to phone says how to bring a record across on an iPhone (a backup
    in Safari, restored in the new icon) instead of "a way is coming".
  - Home shows one reminder at a time, the backup reminder first; while it
    shows, the Add to phone box waits and its link stands in.
  - Privacy & backup: "only on this device" said once; the storage details
    are folded into "Space on this device", in plainer words.
  - What happened no longer mentions the microphone twice; the record line
    reads "Record: <name> · Change" everywhere; Contacts is a card on Keep
    track; "Add another like one before"; documents say "Relates to:".
  - After making a backup, "Where to keep it": somewhere only you can
    open, not a shared family account, a group chat or a work email.
  - Reports follow one pattern: background, treatment, effects, money,
    timeline, supporting papers, contacts last. The PIP pack starts with
    injuries and symptoms; the personal injury summary keeps its costs
    together; the full record puts work straight after what happened and
    the chronology near the end. "How things are now" is the one name for
    that section, and the cost totals no longer show a count of entries.
- 27 September 2026, pictures in the PDF: photos of letters (E refs) and
  Quick Note photos (P refs) in a report are drawn in the PDF under
  "Pictures", each under its reference, shrunk to 1400px JPEGs on the
  device (`makePdf.ts`, canvas). Only the report's own E and P references
  are drawn, so private files can't appear. Letters that are PDF files
  can't be drawn inside a PDF; a note under the letters list says the
  letters themselves come in the zip, named to match.
- 27 September 2026, the microphone help line now reads "Rather talk than
  type?" (was "Can't find the microphone?"), so it tells everyone they can
  speak, not only those who already know. Same fold-out and steps; no
  microphone icon, since that would look like a button that records.
  Its Samsung steps say the microphone is at the bottom left, under the
  keys (as on the owner's S23), then the row above the keys. Quick Note and
  How it affects me no longer repeat the microphone in their hint.
- 27 September 2026, microphone picture: "Rather talk than type?" shows
  what the key looks like ("It looks like this:"), matched to the phone,
  inside the fold-out only and never as a button. Android uses Google's
  Material "mic" icon (the one Gboard uses, Apache 2.0, licence in
  `src/assets/icons/`); iPhone and Samsung use our own close drawings,
  because Apple's and Samsung's icons can't be used in a web app
  (`src/components/MicIcon.tsx`).
- 27 September 2026, CI minutes: the repository is private, so GitHub
  Actions has a free monthly allowance, and checks stopped starting once it
  ran out. CI now runs once per change, on pull requests and on main after
  a merge (not also on every branch push), and a newer push to a pull
  request cancels the older run. Nothing is paid for.
- 27 September 2026, footer: the small line under the tagline reads
  "© 2026 Say It Once · version …" (was "Say It Once, test version …").
  The owner's personal name stays out of the app, like their email; the
  version stays so a phone's update can be checked.
- 27 September 2026, "Keep this private" stays (choosing entries per report
  isn't a safeguard for someone exhausted; private is decided once, when
  writing, and covers every output). Its hint is shorter: "Just for you.
  It's never put in anything you share." Not "only you will see it",
  because the person's backup includes private entries and anyone using
  the phone can see the record.
- 27 September 2026, calendar after adding: straight after a new upcoming,
  non-private appointment is saved (from Home or Appointments), "Add to my
  calendar" appears under "Appointment saved.", while the date is in mind.
  It goes once another message replaces it. It isn't on Home's "Your next
  appointment" box, which stays calm; the phone's calendar gives the
  reminder (`src/features/track/AddToCalendar.tsx`).
- 27 September 2026, locked backups: a backup can be locked with a password
  the person chooses ("Yes, lock it" is the default and recommended), so it's safe
  to keep in email or a cloud drive and survives losing the phone. The zip
  is encrypted on the device with the Stage 7 module (Argon2id key from the
  password, libsodium secretstream in 64 KiB pieces, the readable header
  bound to the contents; `src/crypto/backup.ts`) and saved as
  `… (locked).sayitonce`. At least 12 characters, not a well-known
  password; "Suggest a password" gives four words; the person ticks "I've
  written the password down" first, because nobody can reset it. Restore
  asks for the password and says plainly when it doesn't match. Unlocked
  backups stay available. This is the first use of `src/crypto/` in the
  app; the independent cryptography review is still wanted before sync,
  and should cover this too. The browser is already asked to keep the
  record after the first save (`requestPersistence` in the store).
