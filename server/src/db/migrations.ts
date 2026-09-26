import { sql, type Kysely } from 'kysely';
import type { Migration, MigrationProvider } from 'kysely/migration';

// Database migrations, in order. Each one is kept forever once released:
// to change the database, add a new migration below. Never edit an old one.

const migrations: Record<string, Migration> = {
  '2026-09-26-01-initial': {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable('accounts')
        .addColumn('id', 'uuid', (c) => c.primaryKey())
        .addColumn('email', 'text', (c) => c.notNull().unique())
        .addColumn('last_seq', 'bigint', (c) => c.notNull().defaultTo(0))
        .addColumn('plan', 'text', (c) => c.notNull().defaultTo('free'))
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable('sign_in_codes')
        .addColumn('id', 'uuid', (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('email', 'text', (c) => c.notNull())
        .addColumn('code_hash', 'bytea', (c) => c.notNull())
        .addColumn('attempts', 'integer', (c) => c.notNull().defaultTo(0))
        .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
        .addColumn('used_at', 'timestamptz')
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();
      await db.schema.createIndex('sign_in_codes_email').on('sign_in_codes').columns(['email', 'created_at']).execute();

      await db.schema
        .createTable('rate_events')
        .addColumn('id', 'uuid', (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('kind', 'text', (c) => c.notNull())
        .addColumn('subject', 'text', (c) => c.notNull())
        .addColumn('at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();
      await db.schema.createIndex('rate_events_lookup').on('rate_events').columns(['kind', 'subject', 'at']).execute();

      await db.schema
        .createTable('devices')
        .addColumn('id', 'uuid', (c) => c.primaryKey())
        .addColumn('account_id', 'uuid', (c) => c.notNull().references('accounts.id').onDelete('cascade'))
        .addColumn('name', 'text', (c) => c.notNull())
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn('last_seen_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn('signed_out_at', 'timestamptz')
        .execute();

      await db.schema
        .createTable('sessions')
        .addColumn('token_hash', 'bytea', (c) => c.primaryKey())
        .addColumn('account_id', 'uuid', (c) => c.notNull().references('accounts.id').onDelete('cascade'))
        .addColumn('device_id', 'uuid', (c) => c.notNull().references('devices.id').onDelete('cascade'))
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
        .addColumn('last_seen_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable('account_keys')
        .addColumn('account_id', 'uuid', (c) => c.primaryKey().references('accounts.id').onDelete('cascade'))
        .addColumn('passphrase_wrap', 'bytea', (c) => c.notNull())
        .addColumn('kdf', 'jsonb', (c) => c.notNull())
        .addColumn('recovery_wrap', 'bytea', (c) => c.notNull())
        .addColumn('version', 'integer', (c) => c.notNull())
        .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable('record_keys')
        .addColumn('account_id', 'uuid', (c) => c.notNull().references('accounts.id').onDelete('cascade'))
        .addColumn('record_id', 'uuid', (c) => c.notNull())
        .addColumn('wrapped', 'bytea', (c) => c.notNull())
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .addPrimaryKeyConstraint('record_keys_pk', ['account_id', 'record_id'])
        .execute();

      await db.schema
        .createTable('items')
        .addColumn('item_id', 'uuid', (c) => c.primaryKey())
        .addColumn('account_id', 'uuid', (c) => c.notNull().references('accounts.id').onDelete('cascade'))
        .addColumn('record_id', 'uuid')
        .addColumn('version', 'integer', (c) => c.notNull())
        .addColumn('deleted', 'boolean', (c) => c.notNull().defaultTo(false))
        .addColumn('wrapped_key', 'bytea')
        .addColumn('ciphertext', 'bytea')
        .addColumn('seq', 'bigint', (c) => c.notNull())
        .addColumn('written_by', 'uuid', (c) => c.notNull())
        .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();
      await db.schema.createIndex('items_account_seq').on('items').columns(['account_id', 'seq']).execute();
      await db.schema.createIndex('items_account_record').on('items').columns(['account_id', 'record_id']).execute();

      await db.schema
        .createTable('push_requests')
        .addColumn('account_id', 'uuid', (c) => c.notNull().references('accounts.id').onDelete('cascade'))
        .addColumn('request_id', 'text', (c) => c.notNull())
        .addColumn('response', 'jsonb', (c) => c.notNull())
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .addPrimaryKeyConstraint('push_requests_pk', ['account_id', 'request_id'])
        .execute();

      await db.schema
        .createTable('files')
        .addColumn('file_id', 'uuid', (c) => c.primaryKey())
        .addColumn('account_id', 'uuid', (c) => c.notNull().references('accounts.id').onDelete('cascade'))
        .addColumn('record_id', 'uuid', (c) => c.notNull())
        .addColumn('wrapped_key', 'bytea', (c) => c.notNull())
        .addColumn('chunk_count', 'integer', (c) => c.notNull())
        .addColumn('total_size', 'bigint', (c) => c.notNull())
        .addColumn('complete', 'boolean', (c) => c.notNull().defaultTo(false))
        .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
        .execute();

      await db.schema
        .createTable('file_chunks')
        .addColumn('file_id', 'uuid', (c) => c.notNull().references('files.file_id').onDelete('cascade'))
        .addColumn('n', 'integer', (c) => c.notNull())
        .addColumn('data', 'bytea', (c) => c.notNull())
        .addPrimaryKeyConstraint('file_chunks_pk', ['file_id', 'n'])
        .execute();
    },
  },
};

export const migrationProvider: MigrationProvider = {
  getMigrations: async () => migrations,
};
