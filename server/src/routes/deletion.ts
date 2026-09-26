import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { uuidSchema } from '../bytes.ts';
import type { Config } from '../config.ts';
import type { Database } from '../db/schema.ts';
import { clearSessionCookie, sessionOf } from '../session.ts';

// Deleting (docs/architecture.md, "Deletion"). A record: every item in it
// becomes a tombstone (ID, version and "deleted" only; no key or contents),
// and its key and files are removed. Tombstones stay so an offline device
// can't bring deleted items back. An account: everything goes, including
// the email address. Nightly backups keep deleted data for at most 30 days
// (docs/server.md).

export function deletionRoutes(app: FastifyInstance, db: Kysely<Database>, config: Config): void {
  app.delete<{ Params: { recordId: string } }>(
    '/v1/records/:recordId',
    { config: { signedIn: true }, schema: { params: { type: 'object', properties: { recordId: uuidSchema } } } },
    async (request) => {
      const { accountId, deviceId } = sessionOf(request);
      const { recordId } = request.params;
      return db.transaction().execute(async (tx) => {
        await tx.selectFrom('accounts').select('id').where('id', '=', accountId).forUpdate().executeTakeFirstOrThrow();
        const live = await tx
          .selectFrom('items')
          .select(['itemId', 'version'])
          .where('accountId', '=', accountId)
          .where('recordId', '=', recordId)
          .where('deleted', '=', false)
          .execute();
        for (const item of live) {
          const { lastSeq } = await tx
            .updateTable('accounts')
            .set((eb) => ({ lastSeq: eb('lastSeq', '+', '1') }))
            .where('id', '=', accountId)
            .returning('lastSeq')
            .executeTakeFirstOrThrow();
          await tx
            .updateTable('items')
            .set({ deleted: true, wrappedKey: null, ciphertext: null, version: item.version + 1, seq: lastSeq, writtenBy: deviceId, updatedAt: new Date() })
            .where('itemId', '=', item.itemId)
            .execute();
        }
        await tx.deleteFrom('recordKeys').where('accountId', '=', accountId).where('recordId', '=', recordId).execute();
        await tx.deleteFrom('files').where('accountId', '=', accountId).where('recordId', '=', recordId).execute();
        return { deletedItems: live.length };
      });
    },
  );

  app.delete<{ Body: { confirm: string } }>(
    '/v1/account',
    {
      config: { signedIn: true },
      schema: {
        body: { type: 'object', required: ['confirm'], additionalProperties: false, properties: { confirm: { const: 'delete my account' } } },
      },
    },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      await db.transaction().execute(async (tx) => {
        const account = await tx.selectFrom('accounts').select('email').where('id', '=', accountId).executeTakeFirstOrThrow();
        await tx.deleteFrom('signInCodes').where('email', '=', account.email).execute();
        // Everything else belongs to the account and goes with it.
        await tx.deleteFrom('accounts').where('id', '=', accountId).execute();
      });
      clearSessionCookie(config, reply);
      return { deleted: true };
    },
  );
}
