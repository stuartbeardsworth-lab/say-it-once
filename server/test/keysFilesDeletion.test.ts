import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { b64, origin, randomB64, signIn, setUpTestServer } from './helpers.ts';

const server = setUpTestServer();
const req = (method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, cookie: string, payload?: unknown, headers: Record<string, string> = {}) =>
  server.app.inject({ method, url, headers: { origin, cookie, ...headers }, ...(payload !== undefined && { payload: payload as object }) });

const accountKeys = (baseVersion: number) => ({
  baseVersion,
  passphraseWrap: randomB64(72),
  recoveryWrap: randomB64(72),
  kdf: { opsLimit: 3, memLimit: 67108864, salt: randomB64(16) },
});

describe('keys', () => {
  it('stores the wrapped account key with compare-and-set, and each record key once', async () => {
    const { cookie } = await signIn(server);
    expect((await req('GET', '/v1/keys', cookie)).json()).toEqual({ account: null, records: [] });
    const first = accountKeys(0);
    expect((await req('PUT', '/v1/keys/account', cookie, first)).json()).toEqual({ version: 1 });
    expect((await req('PUT', '/v1/keys/account', cookie, accountKeys(0))).statusCode).toBe(409);
    const changed = accountKeys(1);
    expect((await req('PUT', '/v1/keys/account', cookie, changed)).json()).toEqual({ version: 2 });
    expect((await req('PUT', '/v1/keys/account', cookie, accountKeys(1))).statusCode).toBe(409);

    const recordId = randomUUID();
    const wrapped = randomB64(72);
    expect((await req('PUT', `/v1/keys/records/${recordId}`, cookie, { wrapped })).statusCode).toBe(201);
    expect((await req('PUT', `/v1/keys/records/${recordId}`, cookie, { wrapped: randomB64(72) })).statusCode).toBe(409);

    expect((await req('GET', '/v1/keys', cookie)).json()).toEqual({
      account: { passphraseWrap: changed.passphraseWrap, recoveryWrap: changed.recoveryWrap, kdf: changed.kdf, version: 2 },
      records: [{ recordId, wrapped }],
    });
  });
});

describe('files', () => {
  it('uploads in pieces, resumes, and is only visible once complete', async () => {
    const phone = await signIn(server, 'files@example.test');
    const laptop = await signIn(server, 'files@example.test');
    const fileId = randomUUID();
    const pieces = [randomBytes(24), randomBytes(65553), randomBytes(1000)];
    const meta = { recordId: randomUUID(), wrappedKey: randomB64(72), chunkCount: 3, totalSize: 66577 };
    expect((await req('POST', `/v1/files/${fileId}`, phone.cookie, meta)).json()).toEqual({ received: [] });
    const put = (n: number) => req('PUT', `/v1/files/${fileId}/chunks/${n}`, phone.cookie, pieces[n], { 'content-type': 'application/octet-stream' });
    expect((await put(0)).statusCode).toBe(204);
    expect((await put(2)).statusCode).toBe(204);
    // Interrupted: registering again says which pieces arrived.
    expect((await req('POST', `/v1/files/${fileId}`, phone.cookie, meta)).json()).toEqual({ received: [0, 2] });
    expect((await req('POST', `/v1/files/${fileId}/complete`, phone.cookie)).json()).toEqual({ error: 'missing-pieces', missing: [1] });
    expect((await req('GET', `/v1/files/${fileId}/chunks/0`, laptop.cookie)).statusCode).toBe(404);
    expect((await put(1)).statusCode).toBe(204);
    expect((await req('POST', `/v1/files/${fileId}/complete`, phone.cookie)).json()).toEqual({ complete: true });

    expect((await req('GET', `/v1/files/${fileId}`, laptop.cookie)).json()).toMatchObject({ chunkCount: 3, complete: true, wrappedKey: meta.wrappedKey });
    for (let n = 0; n < 3; n++) {
      const got = await req('GET', `/v1/files/${fileId}/chunks/${n}`, laptop.cookie);
      expect(b64(got.rawPayload)).toBe(b64(pieces[n]!));
    }
    expect((await put(1)).statusCode).toBe(409);
  });

  it('refuses a piece bigger than 64 KiB + 17 bytes, and hides files from other accounts', async () => {
    const a = await signIn(server);
    const b = await signIn(server);
    const fileId = randomUUID();
    await req('POST', `/v1/files/${fileId}`, a.cookie, { recordId: randomUUID(), wrappedKey: randomB64(72), chunkCount: 2, totalSize: 10 });
    const big = await req('PUT', `/v1/files/${fileId}/chunks/1`, a.cookie, randomBytes(65554), { 'content-type': 'application/octet-stream' });
    expect(big.statusCode).toBe(413);
    expect((await req('GET', `/v1/files/${fileId}`, b.cookie)).statusCode).toBe(404);
    expect((await req('PUT', `/v1/files/${fileId}/chunks/0`, b.cookie, randomBytes(24), { 'content-type': 'application/octet-stream' })).statusCode).toBe(404);
  });
});

describe('deleting', () => {
  async function seedRecord(cookie: string, recordId: string) {
    const itemId = randomUUID();
    await req('POST', '/v1/sync/push', cookie, {
      requestId: randomUUID(),
      items: [{ itemId, recordId, baseVersion: 0, deleted: false, wrappedKey: randomB64(72), ciphertext: randomB64(552) }],
    });
    await req('PUT', `/v1/keys/records/${recordId}`, cookie, { wrapped: randomB64(72) });
    const fileId = randomUUID();
    await req('POST', `/v1/files/${fileId}`, cookie, { recordId, wrappedKey: randomB64(72), chunkCount: 2, totalSize: 10 });
    await req('PUT', `/v1/files/${fileId}/chunks/0`, cookie, randomBytes(24), { 'content-type': 'application/octet-stream' });
    return { itemId, fileId };
  }

  it('a record: its items become tombstones other devices pull, and its key and files are gone', async () => {
    const phone = await signIn(server, 'delrec@example.test');
    const laptop = await signIn(server, 'delrec@example.test');
    const keep = randomUUID();
    const gone = randomUUID();
    await seedRecord(phone.cookie, keep);
    const { itemId, fileId } = await seedRecord(phone.cookie, gone);
    const before = (await req('GET', '/v1/sync/pull?cursor=0', laptop.cookie)).json();

    expect((await req('DELETE', `/v1/records/${gone}`, phone.cookie)).json()).toEqual({ deletedItems: 1 });
    const after = (await req('GET', `/v1/sync/pull?cursor=${before.cursor}`, laptop.cookie)).json();
    expect(after.items).toEqual([expect.objectContaining({ itemId, deleted: true, wrappedKey: null, ciphertext: null, version: 2 })]);
    const keys = (await req('GET', '/v1/keys', laptop.cookie)).json();
    expect(keys.records.map((r: { recordId: string }) => r.recordId)).toEqual([keep]);
    expect(await server.db.selectFrom('files').select('fileId').where('fileId', '=', fileId).execute()).toEqual([]);
    expect(await server.db.selectFrom('fileChunks').select('n').where('fileId', '=', fileId).execute()).toEqual([]);
  });

  it('an account: everything about it goes, including the email address', async () => {
    const { cookie, accountId, email } = await signIn(server, 'leaving@example.test');
    await seedRecord(cookie, randomUUID());
    await req('PUT', '/v1/keys/account', cookie, accountKeys(0));
    expect((await req('DELETE', '/v1/account', cookie, { confirm: 'wrong' })).statusCode).toBe(400);
    expect((await req('DELETE', '/v1/account', cookie, { confirm: 'delete my account' })).json()).toEqual({ deleted: true });

    const db = server.db;
    const left = await Promise.all([
      db.selectFrom('accounts').select('id').where('id', '=', accountId).execute(),
      db.selectFrom('devices').select('id').where('accountId', '=', accountId).execute(),
      db.selectFrom('sessions').select('accountId').where('accountId', '=', accountId).execute(),
      db.selectFrom('accountKeys').select('accountId').where('accountId', '=', accountId).execute(),
      db.selectFrom('recordKeys').select('accountId').where('accountId', '=', accountId).execute(),
      db.selectFrom('items').select('itemId').where('accountId', '=', accountId).execute(),
      db.selectFrom('files').select('fileId').where('accountId', '=', accountId).execute(),
      db.selectFrom('pushRequests').select('requestId').where('accountId', '=', accountId).execute(),
      db.selectFrom('signInCodes').select('id').where('email', '=', email).execute(),
    ]);
    expect(left.map((rows) => rows.length)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect((await req('GET', '/v1/me', cookie)).statusCode).toBe(401);
  });
});
