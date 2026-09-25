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

## Where things live

| Folder | What's in it |
| --- | --- |
| `src/domain/` | The item types, fixed wording lists, validation, money and dates. No storage code. |
| `src/store/` | The only code that touches the database on the device (Dexie). One write queue, honest errors, deleting everywhere. |
| `src/forms/` | Form helpers: saving as the person types, entry forms, handing over files. |
| `src/features/` | Pieces of screens grouped by topic: Quick Notes, How it affects me, Keep track. |
| `src/components/` | Accessible building blocks: dialogs, fields, save status, text size. |
| `src/shell/`, `src/screens/` | The app's frame and its screens. |
| `docs/` | The specification, architecture, and a walkthrough for each stage. |
