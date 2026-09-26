import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { sql, type Kysely } from 'kysely';
import type { Config } from '../config.ts';
import type { Database } from '../db/schema.ts';
import type { Mailer } from '../mailer.ts';
import { allow, count, exceeded, limits } from '../rateLimit.ts';
import { clearSessionCookie, sessionOf, startSession } from '../session.ts';
import { newCode, sameHash, sha256 } from '../tokens.ts';

// Signing in with a 6-digit code sent by email (docs/architecture.md,
// "Account, sign-in, unlock and recovery"). A code works for 10 minutes and
// allows 5 tries. Asking for a code never says whether an account exists.
// Signing in proves who someone is; it does not unlock their record, which
// needs the passphrase or recovery key on the device.

const codeMinutes = 10;
const triesPerCode = 5;

const emailSchema = { type: 'string', minLength: 3, maxLength: 254, pattern: '^[^\\s@]+@[^\\s@]+$' } as const;

const codeHash = (email: string, code: string) => sha256(`${email}:${code}`);

export function authRoutes(app: FastifyInstance, db: Kysely<Database>, config: Config, mailer: Mailer): void {
  app.post<{ Body: { email: string } }>(
    '/v1/auth/code',
    { schema: { body: { type: 'object', required: ['email'], additionalProperties: false, properties: { email: emailSchema } } } },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      if (!(await allow(db, limits.codesPerIp, request.ip)) || !(await allow(db, limits.codesPerEmail, email))) {
        return reply.code(429).send({ error: 'too-many' });
      }
      const code = newCode();
      await db
        .insertInto('signInCodes')
        .values({ email, codeHash: codeHash(email, code), expiresAt: new Date(Date.now() + codeMinutes * 60 * 1000) })
        .execute();
      try {
        await mailer.sendSignInCode(email, code);
      } catch (error) {
        request.log.error({ err: error }, 'sign-in email failed');
        return reply.code(502).send({ error: 'email-failed' });
      }
      return reply.code(202).send({ sent: true });
    },
  );

  app.post<{ Body: { email: string; code: string; deviceName: string } }>(
    '/v1/auth/verify',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'code', 'deviceName'],
          additionalProperties: false,
          properties: {
            email: emailSchema,
            code: { type: 'string', pattern: '^[0-9]{6}$' },
            deviceName: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      if (await exceeded(db, limits.wrongCodesPerIp, request.ip)) return reply.code(429).send({ error: 'too-many' });

      const result = await db.transaction().execute(async (tx) => {
        const current = await tx
          .selectFrom('signInCodes')
          .selectAll()
          .where('email', '=', email)
          .where('usedAt', 'is', null)
          .where('expiresAt', '>', sql<Date>`now()`)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .forUpdate()
          .executeTakeFirst();
        if (!current || current.attempts >= triesPerCode) return { ok: false as const, error: 'code-expired' };
        await tx.updateTable('signInCodes').set({ attempts: current.attempts + 1 }).where('id', '=', current.id).execute();
        if (!sameHash(current.codeHash, codeHash(email, request.body.code))) {
          return { ok: false as const, error: 'wrong-code', triesLeft: triesPerCode - current.attempts - 1 };
        }
        // This code, and any others still waiting for this address, can't be used again.
        await tx.updateTable('signInCodes').set({ usedAt: new Date() }).where('email', '=', email).where('usedAt', 'is', null).execute();

        let account = await tx.selectFrom('accounts').select('id').where('email', '=', email).executeTakeFirst();
        const newAccount = !account;
        if (!account) {
          account = { id: randomUUID() };
          await tx.insertInto('accounts').values({ id: account.id, email }).execute();
        }
        const deviceId = randomUUID();
        await tx.insertInto('devices').values({ id: deviceId, accountId: account.id, name: request.body.deviceName }).execute();
        return { ok: true as const, accountId: account.id, deviceId, newAccount };
      });

      if (!result.ok) {
        if (result.error === 'wrong-code') await count(db, limits.wrongCodesPerIp, request.ip);
        return reply.code(400).send(result.ok === false && 'triesLeft' in result ? { error: result.error, triesLeft: result.triesLeft } : { error: result.error });
      }
      await startSession(db, config, reply, { accountId: result.accountId, deviceId: result.deviceId });
      return { accountId: result.accountId, deviceId: result.deviceId, newAccount: result.newAccount };
    },
  );

  app.post('/v1/auth/sign-out', { config: { signedIn: true } }, async (request, reply) => {
    const session = request.session;
    if (session) await db.deleteFrom('sessions').where('deviceId', '=', session.deviceId).execute();
    if (session) await db.deleteFrom('devices').where('id', '=', session.deviceId).execute();
    clearSessionCookie(config, reply);
    return { signedOut: true };
  });

  app.get('/v1/me', { config: { signedIn: true } }, async (request) => {
    const { accountId, deviceId } = sessionOf(request);
    const account = await db.selectFrom('accounts').select(['email', 'plan']).where('id', '=', accountId).executeTakeFirstOrThrow();
    const devices = await db
      .selectFrom('devices')
      .select(['id', 'name', 'createdAt', 'lastSeenAt'])
      .where('accountId', '=', accountId)
      .where('signedOutAt', 'is', null)
      .orderBy('createdAt')
      .execute();
    return {
      accountId,
      email: account.email,
      plan: account.plan,
      deviceId,
      devices: devices.map((d) => ({ ...d, current: d.id === deviceId })),
    };
  });

  /** Signs another device out (a lost or stolen phone). It wipes its copy when it next connects. */
  app.delete<{ Params: { deviceId: string } }>(
    '/v1/devices/:deviceId',
    { config: { signedIn: true }, schema: { params: { type: 'object', properties: { deviceId: { type: 'string', format: 'uuid' } } } } },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      const updated = await db
        .updateTable('devices')
        .set({ signedOutAt: new Date() })
        .where('id', '=', request.params.deviceId)
        .where('accountId', '=', accountId)
        .executeTakeFirst();
      if (updated.numUpdatedRows === 0n) return reply.code(404).send({ error: 'not-found' });
      // Its session is kept until it next connects, so it can be told "signed-out" and wipe its copy.
      return { signedOut: true };
    },
  );
}
