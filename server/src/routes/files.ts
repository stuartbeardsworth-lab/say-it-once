import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { bytesSchema, fromBase64url, toBase64url, uuidSchema } from '../bytes.ts';
import type { Database } from '../db/schema.ts';
import { sessionOf } from '../session.ts';

// Encrypted files (docs/architecture.md, "Files and attachments"), stored
// in the database for now (decided 26 September 2026). A file is registered
// with its wrapped key and number of pieces, the pieces arrive one at a
// time (each can be sent again safely, so an interrupted upload resumes),
// and it becomes visible to other devices only once every piece is here.
// Piece 0 is the secretstream header; the rest are 64 KiB + 17 bytes at most.

const maxPieceBytes = 64 * 1024 + 17;
/** 25 MB (the app's limit) in 64 KiB pieces, plus the header. */
const maxPieces = Math.ceil((25 * 1024 * 1024) / (64 * 1024)) + 1;

const fileParams = { type: 'object', properties: { fileId: uuidSchema } } as const;
const pieceParams = { type: 'object', properties: { fileId: uuidSchema, n: { type: 'string', pattern: '^[0-9]{1,4}$' } } } as const;
/** The piece number from the address; URL parts are text, and aren't converted automatically. */
const pieceNumber = (n: string) => Number(n);

export function fileRoutes(app: FastifyInstance, db: Kysely<Database>): void {
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: maxPieceBytes }, (_request, body, done) => {
    done(null, body);
  });

  async function ownFile(accountId: string, fileId: string) {
    return db.selectFrom('files').selectAll().where('fileId', '=', fileId).where('accountId', '=', accountId).executeTakeFirst();
  }

  app.post<{ Params: { fileId: string }; Body: { recordId: string; wrappedKey: string; chunkCount: number; totalSize: number } }>(
    '/v1/files/:fileId',
    {
      config: { signedIn: true },
      schema: {
        params: fileParams,
        body: {
          type: 'object',
          required: ['recordId', 'wrappedKey', 'chunkCount', 'totalSize'],
          additionalProperties: false,
          properties: {
            recordId: uuidSchema,
            wrappedKey: bytesSchema(128),
            chunkCount: { type: 'integer', minimum: 2, maximum: maxPieces },
            totalSize: { type: 'integer', minimum: 0, maximum: maxPieces * maxPieceBytes },
          },
        },
      },
    },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      const { fileId } = request.params;
      const existing = await db.selectFrom('files').select(['accountId', 'complete']).where('fileId', '=', fileId).executeTakeFirst();
      if (existing && existing.accountId !== accountId) return reply.code(409).send({ error: 'conflict' });
      if (existing?.complete) return reply.code(409).send({ error: 'already-complete' });
      if (!existing) {
        await db
          .insertInto('files')
          .values({
            fileId,
            accountId,
            recordId: request.body.recordId,
            wrappedKey: fromBase64url(request.body.wrappedKey),
            chunkCount: request.body.chunkCount,
            totalSize: String(request.body.totalSize),
            complete: false,
          })
          .execute();
      }
      // Which pieces are already here, so an interrupted upload can carry on.
      const have = await db.selectFrom('fileChunks').select('n').where('fileId', '=', fileId).orderBy('n').execute();
      return { received: have.map((c) => c.n) };
    },
  );

  app.put<{ Params: { fileId: string; n: string }; Body: Buffer }>(
    '/v1/files/:fileId/chunks/:n',
    { config: { signedIn: true }, schema: { params: pieceParams } },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      const file = await ownFile(accountId, request.params.fileId);
      if (!file) return reply.code(404).send({ error: 'not-found' });
      if (file.complete) return reply.code(409).send({ error: 'already-complete' });
      const n = pieceNumber(request.params.n);
      if (n >= file.chunkCount) return reply.code(400).send({ error: 'no-such-piece' });
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) return reply.code(400).send({ error: 'empty' });
      await db
        .insertInto('fileChunks')
        .values({ fileId: file.fileId, n, data: request.body })
        .onConflict((oc) => oc.columns(['fileId', 'n']).doUpdateSet({ data: request.body }))
        .execute();
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { fileId: string } }>(
    '/v1/files/:fileId/complete',
    { config: { signedIn: true }, schema: { params: fileParams } },
    async (request, reply) => {
      const { accountId } = sessionOf(request);
      const file = await ownFile(accountId, request.params.fileId);
      if (!file) return reply.code(404).send({ error: 'not-found' });
      const have = new Set((await db.selectFrom('fileChunks').select('n').where('fileId', '=', file.fileId).execute()).map((c) => c.n));
      const missing = Array.from({ length: file.chunkCount }, (_, n) => n).filter((n) => !have.has(n));
      if (missing.length) return reply.code(400).send({ error: 'missing-pieces', missing });
      await db.updateTable('files').set({ complete: true }).where('fileId', '=', file.fileId).execute();
      return { complete: true };
    },
  );

  app.get<{ Params: { fileId: string } }>(
    '/v1/files/:fileId',
    { config: { signedIn: true }, schema: { params: fileParams } },
    async (request, reply) => {
      const file = await ownFile(sessionOf(request).accountId, request.params.fileId);
      if (!file) return reply.code(404).send({ error: 'not-found' });
      return {
        fileId: file.fileId,
        recordId: file.recordId,
        wrappedKey: toBase64url(file.wrappedKey),
        chunkCount: file.chunkCount,
        totalSize: Number(file.totalSize),
        complete: file.complete,
      };
    },
  );

  app.get<{ Params: { fileId: string; n: string } }>(
    '/v1/files/:fileId/chunks/:n',
    { config: { signedIn: true }, schema: { params: pieceParams } },
    async (request, reply) => {
      const file = await ownFile(sessionOf(request).accountId, request.params.fileId);
      if (!file?.complete) return reply.code(404).send({ error: 'not-found' });
      const piece = await db
        .selectFrom('fileChunks')
        .select('data')
        .where('fileId', '=', file.fileId)
        .where('n', '=', pieceNumber(request.params.n))
        .executeTakeFirst();
      if (!piece) return reply.code(404).send({ error: 'not-found' });
      return reply.type('application/octet-stream').send(piece.data);
    },
  );

  app.delete<{ Params: { fileId: string } }>(
    '/v1/files/:fileId',
    { config: { signedIn: true }, schema: { params: fileParams } },
    async (request) => {
      await db.deleteFrom('files').where('fileId', '=', request.params.fileId).where('accountId', '=', sessionOf(request).accountId).execute();
      return { deleted: true };
    },
  );
}
