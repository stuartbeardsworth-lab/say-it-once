import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { origin, randomB64, signIn, setUpTestServer } from './helpers.ts';

const server = setUpTestServer();

async function push(cookie: string, items: object[], requestId: string = randomUUID()) {
  const res = await server.app.inject({ method: 'POST', url: '/v1/sync/push', headers: { origin, cookie }, payload: { requestId, items } });
  return res;
}
const pull = async (cookie: string, cursor = '0') =>
  (await server.app.inject({ method: 'GET', url: `/v1/sync/pull?cursor=${cursor}`, headers: { cookie } })).json();

const envelope = (itemId: string, recordId: string | null, baseVersion: number) => ({
  itemId,
  recordId,
  baseVersion,
  deleted: false,
  wrappedKey: randomB64(72),
  ciphertext: randomB64(552),
});

describe('sync', () => {
  it('accepts a new item at version 1, and another device pulls exactly what was sent', async () => {
    const phone = await signIn(server, 'sync1@example.test');
    const laptop = await signIn(server, 'sync1@example.test');
    const item = envelope(randomUUID(), randomUUID(), 0);
    expect((await push(phone.cookie, [item])).json()).toEqual({ results: [{ itemId: item.itemId, status: 'accepted', version: 1 }] });
    const pulled = await pull(laptop.cookie);
    expect(pulled.items).toHaveLength(1);
    expect(pulled.items[0]).toMatchObject({ itemId: item.itemId, recordId: item.recordId, version: 1, deleted: false, wrappedKey: item.wrappedKey, ciphertext: item.ciphertext });
    expect(await pull(laptop.cookie, pulled.cursor)).toMatchObject({ items: [], cursor: pulled.cursor, more: false });
  });

  it('refuses a write based on an old version, and returns what’s there now (compare-and-set)', async () => {
    const a = await signIn(server, 'sync2@example.test');
    const b = await signIn(server, 'sync2@example.test');
    const id = randomUUID();
    const rec = randomUUID();
    await push(a.cookie, [envelope(id, rec, 0)]);
    const fromA = envelope(id, rec, 1);
    expect((await push(a.cookie, [fromA])).json().results[0]).toMatchObject({ status: 'accepted', version: 2 });
    const fromB = await push(b.cookie, [envelope(id, rec, 1)]);
    expect(fromB.json().results[0]).toMatchObject({ status: 'conflict', current: { version: 2, ciphertext: fromA.ciphertext } });
    // A new item with the same ID as an existing one is also a conflict.
    expect((await push(b.cookie, [envelope(id, rec, 0)])).json().results[0].status).toBe('conflict');
  });

  it('gives a retried push the same answer, without applying it twice', async () => {
    const { cookie } = await signIn(server);
    const item = envelope(randomUUID(), null, 0);
    const first = await push(cookie, [item], 'retry-request-1');
    const again = await push(cookie, [item], 'retry-request-1');
    expect(again.json()).toEqual(first.json());
    expect((await pull(cookie)).items).toHaveLength(1);
  });

  it('keeps each account’s items to itself', async () => {
    const a = await signIn(server);
    const b = await signIn(server);
    const item = envelope(randomUUID(), randomUUID(), 0);
    await push(a.cookie, [item]);
    expect((await pull(b.cookie)).items).toEqual([]);
    expect((await push(b.cookie, [{ ...envelope(item.itemId, item.recordId, 1) }])).json().results[0]).toMatchObject({ status: 'refused' });
  });

  it('a deleted item keeps no key or contents, and can’t be brought back', async () => {
    const { cookie } = await signIn(server);
    const id = randomUUID();
    const rec = randomUUID();
    await push(cookie, [envelope(id, rec, 0)]);
    const del = { itemId: id, recordId: rec, baseVersion: 1, deleted: true, wrappedKey: null, ciphertext: null };
    expect((await push(cookie, [del])).json().results[0]).toMatchObject({ status: 'accepted', version: 2 });
    const row = await server.db.selectFrom('items').selectAll().where('itemId', '=', id).executeTakeFirstOrThrow();
    expect(row).toMatchObject({ deleted: true, wrappedKey: null, ciphertext: null });
    expect((await push(cookie, [envelope(id, rec, 2)])).json().results[0].status).toBe('gone');
  });

  it('refuses mixed-up envelopes: deleted with contents, missing contents, or moving record', async () => {
    const { cookie } = await signIn(server);
    const id = randomUUID();
    const rec = randomUUID();
    const res = await push(cookie, [
      { ...envelope(randomUUID(), rec, 0), deleted: true },
      { ...envelope(randomUUID(), rec, 0), ciphertext: null },
      envelope(id, rec, 0),
    ]);
    expect(res.json().results.map((r: { status: string }) => r.status)).toEqual(['refused', 'refused', 'accepted']);
    expect((await push(cookie, [envelope(id, randomUUID(), 1)])).json().results[0].status).toBe('refused');
  });

  it('pulls in change order, 500 at a time', async () => {
    const { cookie } = await signIn(server);
    const ids: string[] = [];
    for (let batch = 0; batch < 6; batch++) {
      const items = Array.from({ length: 100 }, () => envelope(randomUUID(), null, 0));
      ids.push(...items.map((i) => i.itemId));
      await push(cookie, items);
    }
    const first = await pull(cookie);
    expect(first.items).toHaveLength(500);
    expect(first.more).toBe(true);
    const second = await pull(cookie, first.cursor);
    expect(second.items).toHaveLength(100);
    expect(second.more).toBe(false);
    expect([...first.items, ...second.items].map((i: { itemId: string }) => i.itemId)).toEqual(ids);
  });

  it('refuses malformed pushes and more than 100 items at once', async () => {
    const { cookie } = await signIn(server);
    expect((await push(cookie, [{ itemId: 'not-a-uuid' }])).statusCode).toBe(400);
    expect((await push(cookie, Array.from({ length: 101 }, () => envelope(randomUUID(), null, 0)))).statusCode).toBe(400);
  });
});
