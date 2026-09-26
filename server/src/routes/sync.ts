import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';
import { bytesSchema, fromBase64url, toBase64url, uuidSchema } from '../bytes.ts';
import type { Database, ItemsTable } from '../db/schema.ts';
import { sessionOf } from '../session.ts';

// Sync (docs/architecture.md, "Sync protocol"): push whole encrypted items
// with the version they were based on, and pull everything changed since a
// cursor. A write is accepted only if its base version is the current one
// (compare-and-set), so two devices can never overwrite each other
// unnoticed. The server never merges; it only accepts, refuses or reports.

/** Largest item ciphertext accepted, after padding. */
export const maxItemBytes = 512 * 1024;
const pushLimit = 100;
const pullLimit = 500;

interface PushItem {
  itemId: string;
  recordId: string | null;
  baseVersion: number;
  deleted: boolean;
  wrappedKey: string | null;
  ciphertext: string | null;
}

export type PushResult =
  | { itemId: string; status: 'accepted'; version: number }
  | { itemId: string; status: 'conflict'; current: Envelope }
  | { itemId: string; status: 'gone' }
  | { itemId: string; status: 'refused'; reason: string };

export interface Envelope {
  itemId: string;
  recordId: string | null;
  version: number;
  deleted: boolean;
  wrappedKey: string | null;
  ciphertext: string | null;
  seq: string;
  updatedAt: Date;
}

function envelope(row: Pick<ItemsTable, 'itemId' | 'recordId' | 'version' | 'deleted' | 'wrappedKey' | 'ciphertext' | 'seq'> & { updatedAt: Date }): Envelope {
  return {
    itemId: row.itemId,
    recordId: row.recordId,
    version: row.version,
    deleted: row.deleted,
    wrappedKey: toBase64url(row.wrappedKey),
    ciphertext: toBase64url(row.ciphertext),
    seq: row.seq,
    updatedAt: row.updatedAt,
  };
}

/** Hands out the next number in this account's change order. The account row is locked by the caller. */
async function nextSeq(tx: Transaction<Database>, accountId: string): Promise<string> {
  const row = await tx
    .updateTable('accounts')
    .set((eb) => ({ lastSeq: eb('lastSeq', '+', '1') }))
    .where('id', '=', accountId)
    .returning('lastSeq')
    .executeTakeFirstOrThrow();
  return row.lastSeq;
}

async function pushOne(tx: Transaction<Database>, accountId: string, deviceId: string, item: PushItem): Promise<PushResult> {
  if (item.deleted ? item.wrappedKey !== null || item.ciphertext !== null : item.wrappedKey === null || item.ciphertext === null) {
    return { itemId: item.itemId, status: 'refused', reason: item.deleted ? 'deleted items carry no key or contents' : 'missing key or contents' };
  }
  const existing = await tx.selectFrom('items').selectAll().where('itemId', '=', item.itemId).forUpdate().executeTakeFirst();
  if (existing && existing.accountId !== accountId) return { itemId: item.itemId, status: 'refused', reason: 'not yours' };
  if (existing?.deleted) return { itemId: item.itemId, status: 'gone' };
  if (!existing && item.baseVersion !== 0) return { itemId: item.itemId, status: 'gone' };
  if (existing && existing.version !== item.baseVersion) return { itemId: item.itemId, status: 'conflict', current: envelope(existing) };
  if (existing && existing.recordId !== item.recordId) return { itemId: item.itemId, status: 'refused', reason: 'an item can’t move record' };

  const version = item.baseVersion + 1;
  const values = {
    version,
    deleted: item.deleted,
    wrappedKey: item.wrappedKey ? fromBase64url(item.wrappedKey) : null,
    ciphertext: item.ciphertext ? fromBase64url(item.ciphertext) : null,
    seq: await nextSeq(tx, accountId),
    writtenBy: deviceId,
    updatedAt: new Date(),
  };
  if (existing) await tx.updateTable('items').set(values).where('itemId', '=', item.itemId).execute();
  else await tx.insertInto('items').values({ itemId: item.itemId, accountId, recordId: item.recordId, ...values }).execute();
  return { itemId: item.itemId, status: 'accepted', version };
}

export function syncRoutes(app: FastifyInstance, db: Kysely<Database>): void {
  app.post<{ Body: { requestId: string; items: PushItem[] } }>(
    '/v1/sync/push',
    {
      config: { signedIn: true },
      bodyLimit: pushLimit * maxItemBytes * 1.4,
      schema: {
        body: {
          type: 'object',
          required: ['requestId', 'items'],
          additionalProperties: false,
          properties: {
            requestId: { type: 'string', minLength: 8, maxLength: 100 },
            items: {
              type: 'array',
              maxItems: pushLimit,
              items: {
                type: 'object',
                required: ['itemId', 'recordId', 'baseVersion', 'deleted', 'wrappedKey', 'ciphertext'],
                additionalProperties: false,
                properties: {
                  itemId: uuidSchema,
                  recordId: { anyOf: [uuidSchema, { type: 'null' }] },
                  baseVersion: { type: 'integer', minimum: 0 },
                  deleted: { type: 'boolean' },
                  wrappedKey: { anyOf: [bytesSchema(128), { type: 'null' }] },
                  ciphertext: { anyOf: [bytesSchema(maxItemBytes), { type: 'null' }] },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { accountId, deviceId } = sessionOf(request);
      const { requestId, items } = request.body;
      return db.transaction().execute(async (tx) => {
        // One push at a time per account, so change numbers are handed out,
        // and become visible, in order.
        await tx.selectFrom('accounts').select('id').where('id', '=', accountId).forUpdate().executeTakeFirstOrThrow();
        // A retried request gets the same answer, without being applied twice.
        const earlier = await tx
          .selectFrom('pushRequests')
          .select('response')
          .where('accountId', '=', accountId)
          .where('requestId', '=', requestId)
          .executeTakeFirst();
        if (earlier) return earlier.response as { results: PushResult[] };
        const results: PushResult[] = [];
        for (const item of items) results.push(await pushOne(tx, accountId, deviceId, item));
        const response = { results };
        await tx.insertInto('pushRequests').values({ accountId, requestId, response: JSON.stringify(response) }).execute();
        return response;
      });
    },
  );

  app.get<{ Querystring: { cursor?: string } }>(
    '/v1/sync/pull',
    {
      config: { signedIn: true },
      schema: { querystring: { type: 'object', properties: { cursor: { type: 'string', pattern: '^[0-9]{1,18}$' } } } },
    },
    async (request) => {
      const { accountId } = sessionOf(request);
      const cursor = request.query.cursor ?? '0';
      const rows = await db
        .selectFrom('items')
        .select(['itemId', 'recordId', 'version', 'deleted', 'wrappedKey', 'ciphertext', 'seq', 'updatedAt'])
        .where('accountId', '=', accountId)
        .where('seq', '>', cursor)
        .orderBy('seq')
        .limit(pullLimit + 1)
        .execute();
      const page = rows.slice(0, pullLimit);
      return { items: page.map(envelope), cursor: page.at(-1)?.seq ?? cursor, more: rows.length > pullLimit };
    },
  );
}
