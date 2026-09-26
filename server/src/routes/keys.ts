import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { bytesSchema, fromBase64url, toBase64url, uuidSchema } from '../bytes.ts';
import type { Database } from '../db/schema.ts';
import { sessionOf } from '../session.ts';

// Wrapped keys (docs/architecture.md, "Key hierarchy"): the account key
// wrapped by the passphrase key and by the recovery key, and each record's
// key wrapped by the account key. All are encrypted on the device; the
// server only keeps them. The account keys change with compare-and-set, so
// two devices can't replace each other's passphrase change unnoticed.

const wrapBytes = 128;

export function keyRoutes(app: FastifyInstance, db: Kysely<Database>): void {
  app.get('/v1/keys', { config: { signedIn: true } }, async (request) => {
    const { accountId } = sessionOf(request);
    const account = await db.selectFrom('accountKeys').selectAll().where('accountId', '=', accountId).executeTakeFirst();
    const records = await db.selectFrom('recordKeys').select(['recordId', 'wrapped']).where('accountId', '=', accountId).execute();
    return {
      account: account
        ? {
            passphraseWrap: toBase64url(account.passphraseWrap),
            kdf: account.kdf,
            recoveryWrap: toBase64url(account.recoveryWrap),
            version: account.version,
          }
        : null,
      records: records.map((r) => ({ recordId: r.recordId, wrapped: toBase64url(r.wrapped) })),
    };
  });

  app.put<{ Body: { baseVersion: number; passphraseWrap: string; kdf: { opsLimit: number; memLimit: number; salt: string }; recoveryWrap: string } }>(
    '/v1/keys/account',
    {
      config: { signedIn: true },
      schema: {
        body: {
          type: 'object',
          required: ['baseVersion', 'passphraseWrap', 'kdf', 'recoveryWrap'],
          additionalProperties: false,
          properties: {
            baseVersion: { type: 'integer', minimum: 0 },
            passphraseWrap: bytesSchema(wrapBytes),
            recoveryWrap: bytesSchema(wrapBytes),
            kdf: {
              type: 'object',
              required: ['opsLimit', 'memLimit', 'salt'],
              additionalProperties: false,
              properties: {
                opsLimit: { type: 'integer', minimum: 1, maximum: 10 },
                memLimit: { type: 'integer', minimum: 1, maximum: 268435456 },
                salt: bytesSchema(16),
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      const { baseVersion, passphraseWrap, kdf, recoveryWrap } = request.body;
      const values = {
        passphraseWrap: fromBase64url(passphraseWrap),
        recoveryWrap: fromBase64url(recoveryWrap),
        kdf: JSON.stringify(kdf),
        updatedAt: new Date(),
      };
      const written =
        baseVersion === 0
          ? await db
              .insertInto('accountKeys')
              .values({ accountId, ...values, version: 1 })
              .onConflict((oc) => oc.column('accountId').doNothing())
              .returning('accountId')
              .executeTakeFirst()
              .then((r) => (r ? 1 : 0))
          : await db
              .updateTable('accountKeys')
              .set({ ...values, version: baseVersion + 1 })
              .where('accountId', '=', accountId)
              .where('version', '=', baseVersion)
              .executeTakeFirst()
              .then((r) => Number(r.numUpdatedRows));
      if (written === 0) return reply.code(409).send({ error: 'conflict' });
      return { version: baseVersion + 1 };
    },
  );

  app.put<{ Params: { recordId: string }; Body: { wrapped: string } }>(
    '/v1/keys/records/:recordId',
    {
      config: { signedIn: true },
      schema: {
        params: { type: 'object', properties: { recordId: uuidSchema } },
        body: { type: 'object', required: ['wrapped'], additionalProperties: false, properties: { wrapped: bytesSchema(wrapBytes) } },
      },
    },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      // A record's key never changes once made, so a second write is a conflict.
      const r = await db
        .insertInto('recordKeys')
        .values({ accountId, recordId: request.params.recordId, wrapped: fromBase64url(request.body.wrapped) })
        .onConflict((oc) => oc.columns(['accountId', 'recordId']).doNothing())
        .returning('recordId')
        .executeTakeFirst();
      if (!r) return reply.code(409).send({ error: 'conflict' });
      return reply.code(201).send({ created: true });
    },
  );
}
