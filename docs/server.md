# The server

`server/` is Say It Once's sync server (Build plan Stage 8). It stores
encrypted data for people who turn on sync, and nothing else. Stage 8a (this)
is the code and its tests; Stage 8b puts it live on Hetzner. The app doesn't
use it until Stage 9.

## What the server can and can't see

It keeps:

- **Accounts:** the email address, the plan and the date the account was
  made.
- **Sign-in codes:** a hash of each code (never the code), for 10 minutes.
- **Devices:** the name the person gives each device, and when it was last
  used.
- **Sessions:** a hash of each session token (the token itself lives only in
  the device's cookie).
- **Wrapped keys:** the account key, locked by the passphrase key and by the
  recovery key, and each record's key, locked by the account key. These are
  useless without the passphrase or recovery key, which never reach the
  server.
- **Items:** ID, record ID, version, and the locked contents. It can't see
  what kind of entry an item is, or anything in it. Sizes are padded.
- **Files:** ID, record ID, locked key, number of pieces and total size, and
  the locked pieces. Stored in the database for now (decided 26 September
  2026); they can move to object storage later without changing the app.
- **Limits:** hashed email and IP addresses, with times, kept for a day, to
  limit how often codes can be asked for and guessed.

It never sees: passphrases, recovery keys, the contents of anything, file
names, what kind of entry anything is, or which entries are private.

## How it works

| Call | What it does |
| --- | --- |
| `POST /v1/auth/code` | Emails a 6-digit code. Always says "sent", so it never reveals whether an account exists. Limited to 5 per email and 20 per IP address an hour. |
| `POST /v1/auth/verify` | Checks the code (10 minutes, 5 tries), makes the account if it's new, adds this device, and sets the session cookie (HttpOnly, Secure, SameSite=Strict, 90 days from last use). |
| `POST /v1/auth/sign-out` | Signs this device out. |
| `GET /v1/me` | The account's email and its devices. |
| `DELETE /v1/devices/{id}` | Signs another device out (lost or stolen). It's told "signed-out" when it next connects, so it can wipe its copy. |
| `GET /v1/keys`, `PUT /v1/keys/account`, `PUT /v1/keys/records/{id}` | The wrapped keys. The account keys change with compare-and-set; a record key is written once. |
| `POST /v1/sync/push` | Up to 100 items, each with the version it was based on. Each is accepted (with its new version), a conflict (with what's there now), gone (deleted), or refused. A retried request gets the same answer and isn't applied twice. |
| `GET /v1/sync/pull?cursor=` | Up to 500 changes since the cursor, in order. |
| `POST /v1/files/{id}`, `PUT …/chunks/{n}`, `POST …/complete`, `GET …`, `DELETE …` | Files in pieces of up to 64 KiB + 17 bytes. An interrupted upload carries on; a file is visible only once every piece is there. |
| `DELETE /v1/records/{id}` | Every item in the record becomes a tombstone (no key or contents), and its key and files are removed. |
| `DELETE /v1/account` | Everything about the account goes, including its email address. The request must say "delete my account". |
| `GET /health` | Whether the server and database are working. |

Only the app's own web addresses (`APP_ORIGINS`) may call it from a browser.
Anything that changes data must come from one of them, which, with the
SameSite=Strict cookie, stops other websites acting as the person.

Request contents and cookies are never written to the logs.

## Running it on your own computer

You need Node.js 22.18 or later, and PostgreSQL 16.

```sh
cd server
npm install
# A database for trying it out:
createdb say_it_once_dev
DATABASE_URL=postgres://localhost/say_it_once_dev \
APP_ORIGINS=http://localhost:5173 \
MAILER=log INSECURE_COOKIES=1 \
npm start
```

With `MAILER=log`, codes are printed instead of emailed. This only works
together with `INSECURE_COOKIES=1`, so it can't be switched on by accident on
the real server.

## Settings

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | The PostgreSQL database. |
| `APP_ORIGINS` | The app's web addresses, comma-separated, e.g. `https://app.example.co.uk`. |
| `PORT`, `HOST` | Where to listen (default 127.0.0.1:3000, behind the web server). |
| `INSECURE_COOKIES=1` | Local use only: the cookie works without HTTPS. |
| `MAILER=log` | Local use only: print codes instead of sending them. |

Secrets (the database password, the email provider's key) are set on the
server itself in Stage 8b, never in the repository.

## Tests

`npm test` in `server/` runs 24 tests against a real PostgreSQL. Each test
file makes its own new database and drops it afterwards. Set
`TEST_DATABASE_URL` to a PostgreSQL where the user can create databases
(default `postgres://sio:sio@localhost:5432/postgres`). CI runs them with
PostgreSQL 16 on every push.

## Changing the database

Add a new migration at the end of `server/src/db/migrations.ts`, and never edit
one that has been released. The server applies new migrations when it starts,
and `npm run migrate` applies them without starting.

## Still to do in Stage 8b

- The web address, pointed at Netlify (`app.`) and the server (`api.`).
- A Hetzner server in Germany or Finland: firewall, HTTPS (with automatic
  certificates), automatic security updates, PostgreSQL, and the server
  running as a service that restarts on failure.
- The email provider (EU-based), with the domain's email records so codes
  don't land in spam, and a data processing agreement.
- Nightly database backups kept for 30 days, in a second location, then
  destroyed; and a restore drill done and written down.
- A plain runbook for the owner: updates, checking it's working, and what to
  do if it isn't.
