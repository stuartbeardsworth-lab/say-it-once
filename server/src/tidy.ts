import { sql, type Kysely } from 'kysely';
import type { Database } from './db/schema.ts';

// Removes what is no longer needed, so the server keeps as little as
// possible: limit records after a day, sign-in codes after a day, expired
// sessions, and the answers to push requests (kept for safe retries) after
// a week. Runs every hour.

export async function tidy(db: Kysely<Database>): Promise<void> {
  await db.deleteFrom('rateEvents').where('at', '<', sql<Date>`now() - interval '1 day'`).execute();
  await db.deleteFrom('signInCodes').where('createdAt', '<', sql<Date>`now() - interval '1 day'`).execute();
  await db.deleteFrom('sessions').where('expiresAt', '<', sql<Date>`now()`).execute();
  await db.deleteFrom('pushRequests').where('createdAt', '<', sql<Date>`now() - interval '7 days'`).execute();
}
