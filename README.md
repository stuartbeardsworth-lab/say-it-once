# Say It Once

A record-keeping app for people in the UK recovering from serious injury or
illness. See `CLAUDE.md` for the project brief, `docs/spec.md` for what the
old app does, and `docs/architecture.md` for the design and Build plan.

## Running it on your own computer

You need [Node.js](https://nodejs.org/) 22 or later.

```sh
npm install      # once, to download the tools
npm run dev      # start the app; open the address it prints
```

The **Building blocks** review page (every part of the app in every state,
used by the browser tests) is left out of the real site. To see it, start
the app with `VITE_REVIEW_PAGES=1 npm run dev` and open `#building-blocks`.
The browser tests turn it on themselves (`playwright.config.ts`), and CI
checks that the site build doesn't contain it.

## Checks

| Command | What it does |
| --- | --- |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run lint` | Checks code style and the reports privacy boundary |
| `npm test` | Unit tests for every building block |
| `npm run test:e2e` | Opens real browsers, runs the keyboard walkthrough and the axe accessibility checks |
| `npm run build` | Builds the app for hosting into `dist/` |

Before running `test:e2e` for the first time, install the browsers with
`npx playwright install chromium webkit`.

All of these run on every push in GitHub Actions (`.github/workflows/ci.yml`).

## The server

`server/` is the sync server (Stage 8), with its own `package.json`. See
`docs/server.md` for what it stores, how to run it and its tests.

## Where things live

| Folder | What's in it |
| --- | --- |
| `src/domain/` | The item types, fixed wording lists, validation, money and dates. No storage code. |
| `src/store/` | The only code that touches the database on the device (Dexie). One write queue, honest errors, deleting everywhere. |
| `src/forms/` | Form helpers: saving as the person types, entry forms, handing over files. |
| `src/features/` | Pieces of screens grouped by topic: Quick Notes, How it affects me, Keep track, Use my record, sharing and saving files, backup and restore. |
| `src/shareable/` | `toShareable`, the one privacy filter every report goes through, and its property tests. |
| `src/reports/` | Purposes, what goes in, the report model, and the reading view, PDF, HTML and zip renderers. It may only use the shareable view. |
| `src/components/` | Accessible building blocks: dialogs, fields, save status, text size. |
| `src/shell/`, `src/screens/` | The app's frame and its screens. |
| `src/content/` | Words the owner can change without touching code: the Find support list (`support.json`) and the FAQ (`faq.ts`). |
| `docs/` | The specification, architecture, and a walkthrough for each stage. |

## Changing the Find support list

Open `src/content/support.json` on GitHub, press the pencil icon, edit, and
commit. Netlify publishes the change in a few minutes. A check on every push
makes sure each entry has a name, a description, a secure website and a
phone number written as digits.

## Keep the live site public

In Netlify (say-it-once-home → Project configuration → Access & security →
Visitor access), production must be **No protection**. If visitor
protection is switched on, everyone but you sees "This site is private",
testers and Google Play can't open the app, and installed copies stop
updating. The site holds no one's records, so public is safe.
