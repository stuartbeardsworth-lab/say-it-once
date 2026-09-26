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
  `legacy/index.html`. "Listen" and dictation from the old header and Home
  stay out, as decided; Home's card wording describes only what the new app
  does.
