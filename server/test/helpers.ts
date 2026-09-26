import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { buildApp } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import { connect, migrate } from '../src/db/connect.ts';
import type { Database } from '../src/db/schema.ts';
import { MemoryMailer } from '../src/mailer.ts';

// Each test file gets its own new, empty database on the PostgreSQL named
// by TEST_DATABASE_URL, built by the real migrations, and dropped at the end.

export const origin = 'https://app.say-it-once.test';
const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://sio:sio@localhost:5432/postgres';

export interface TestServer {
  app: FastifyInstance;
  db: Kysely<Database>;
  mailer: MemoryMailer;
}

export function setUpTestServer(): TestServer {
  const server = {} as TestServer;
  const name = `sio_test_${randomBytes(6).toString('hex')}`;
  const admin = new Kysely<unknown>({ dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: adminUrl, max: 1 }) }) });

  beforeAll(async () => {
    await sql`create database ${sql.id(name)}`.execute(admin);
    const url = new URL(adminUrl);
    url.pathname = `/${name}`;
    const config: Config = { databaseUrl: url.toString(), appOrigins: [origin], secureCookies: true, port: 0, host: '127.0.0.1' };
    server.db = connect(config.databaseUrl);
    await migrate(server.db);
    server.mailer = new MemoryMailer();
    server.app = buildApp({ db: server.db, config, mailer: server.mailer, logger: false });
    await server.app.ready();
  });

  afterAll(async () => {
    await server.app?.close();
    await server.db?.destroy();
    await sql`drop database if exists ${sql.id(name)} with (force)`.execute(admin);
    await admin.destroy();
  });

  return server;
}

/** Signs in as a new device, returning the Cookie header to send. */
export async function signIn(server: TestServer, email = `${randomUUID()}@example.test`, deviceName = 'Test phone'): Promise<{ cookie: string; accountId: string; deviceId: string; email: string }> {
  const asked = await server.app.inject({ method: 'POST', url: '/v1/auth/code', headers: { origin }, payload: { email } });
  if (asked.statusCode !== 202) throw new Error(`code: ${asked.statusCode} ${asked.body}`);
  const code = server.mailer.lastCodeFor(email);
  const verified = await server.app.inject({ method: 'POST', url: '/v1/auth/verify', headers: { origin }, payload: { email, code, deviceName } });
  if (verified.statusCode !== 200) throw new Error(`verify: ${verified.statusCode} ${verified.body}`);
  return { cookie: cookieFrom(verified), ...(verified.json() as { accountId: string; deviceId: string }), email };
}

export function cookieFrom(response: LightMyRequestResponse): string {
  const c = response.cookies.find((x) => x.name === 'sio_session');
  if (!c) throw new Error('no session cookie');
  return `sio_session=${c.value}`;
}

export const b64 = (bytes: Buffer | Uint8Array) => Buffer.from(bytes).toString('base64url');
export const randomB64 = (n: number) => b64(randomBytes(n));
