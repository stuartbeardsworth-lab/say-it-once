import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Migrator } from 'kysely/migration';
import pg from 'pg';
import { migrationProvider } from './migrations.ts';
import type { Database } from './schema.ts';

// bigint columns (sequence numbers, sizes) come back as strings, so no
// number is ever silently rounded.

export function connect(databaseUrl: string): Kysely<Database> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  // A connection that drops while idle (the database restarting, say) is
  // replaced on the next query; it mustn't bring the server down.
  pool.on('error', (error) => console.error('Database connection dropped:', error.message));
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  });
}

/** Brings the database up to date. Throws, and changes nothing more, if a migration fails. */
export async function migrate(db: Kysely<Database>): Promise<void> {
  const { error, results } = await new Migrator({ db, provider: migrationProvider }).migrateToLatest();
  for (const r of results ?? []) {
    if (r.status === 'Error') throw new Error(`Migration ${r.migrationName} failed`, { cause: error });
  }
  if (error) throw error instanceof Error ? error : new Error(String(error));
}
