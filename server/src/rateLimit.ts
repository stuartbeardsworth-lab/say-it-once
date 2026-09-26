import { sql, type Kysely } from 'kysely';
import type { Database } from './db/schema.ts';
import { subjectOf } from './tokens.ts';

// Limits on how often something can be done (docs/architecture.md,
// "Sessions"). Kept in the database, not in memory, so they hold across
// restarts. Subjects are hashed, so the table holds no email or IP address.

export interface Limit {
  kind: string;
  max: number;
  windowMinutes: number;
}

export const limits = {
  /** Sign-in codes sent to one email address. */
  codesPerEmail: { kind: 'code-email', max: 5, windowMinutes: 60 },
  /** Sign-in codes asked for from one IP address. */
  codesPerIp: { kind: 'code-ip', max: 20, windowMinutes: 60 },
  /** Wrong codes typed from one IP address, across all codes. */
  wrongCodesPerIp: { kind: 'wrong-code-ip', max: 30, windowMinutes: 60 },
} satisfies Record<string, Limit>;

/** Whether one more is allowed; if so, counts it. */
export async function allow(db: Kysely<Database>, limit: Limit, value: string): Promise<boolean> {
  const subject = subjectOf(limit.kind, value);
  const since = sql<Date>`now() - make_interval(mins => ${limit.windowMinutes})`;
  const row = await db
    .selectFrom('rateEvents')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('kind', '=', limit.kind)
    .where('subject', '=', subject)
    .where('at', '>', since)
    .executeTakeFirstOrThrow();
  if (Number(row.n) >= limit.max) return false;
  await db.insertInto('rateEvents').values({ kind: limit.kind, subject }).execute();
  return true;
}

/** Counts one without asking (for wrong codes, which are limited after the fact). */
export async function count(db: Kysely<Database>, limit: Limit, value: string): Promise<void> {
  await db.insertInto('rateEvents').values({ kind: limit.kind, subject: subjectOf(limit.kind, value) }).execute();
}

export async function exceeded(db: Kysely<Database>, limit: Limit, value: string): Promise<boolean> {
  const row = await db
    .selectFrom('rateEvents')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('kind', '=', limit.kind)
    .where('subject', '=', subjectOf(limit.kind, value))
    .where('at', '>', sql<Date>`now() - make_interval(mins => ${limit.windowMinutes})`)
    .executeTakeFirstOrThrow();
  return Number(row.n) >= limit.max;
}
