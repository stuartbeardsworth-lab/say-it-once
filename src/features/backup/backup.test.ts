// @vitest-environment node
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { blank } from '../../domain/blank';
import type { Item } from '../../domain/types';
import { exampleRecord } from '../../fixtures/example';
import type { Store } from '../../store/store';
import { freshStore } from '../../store/testing';
import { checkBackup, makeBackup } from './backupFile';

// Saving a backup and restoring it brings back every record, entry, link
// and file exactly, private entries included, and never touches what is
// already on the device.

const today = '2026-06-01';

async function storeWithRecords() {
  const store = await freshStore();
  await store.save('profile', null, blank('profile', { personName: 'Sam Taylor' }));
  const ex = exampleRecord(today);
  await store.importRecord(ex.recordName, ex.entries);
  const second = await store.createRecord('Second record');
  await store.save('contact', second, blank('contact', { organisation: 'A private contact' }), { private: true });
  return store;
}

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/** A record's contents with IDs blanked, so records on two devices can be compared. */
async function contentsOf(store: Store) {
  const { records } = await store.backupContents();
  return Promise.all(
    records.map(async (r) => ({
      name: r.meta.data.name,
      items: r.items
        .map((i) => JSON.stringify({ type: i.type, private: i.private, data: i.data, createdAt: i.createdAt }).replace(uuid, 'ID'))
        .sort(),
      files: (await Promise.all(r.files.map(async (f) => `${f.name}|${f.type}|${strFromU8(new Uint8Array((await store.fileBytes(f.id))!))}`))).sort(),
    })),
  );
}

async function backupOf(store: Store) {
  return makeBackup(store, '2026-06-01T10:00:00.000Z');
}

describe('backup and restore', () => {
  it('brings back every record, entry and file exactly, private ones included', async () => {
    const from = await storeWithRecords();
    const to = await freshStore();
    await to.ensureRecord();

    const checked = await checkBackup(await backupOf(from), to);
    if (!checked.ok) throw new Error(checked.reason);
    expect(checked.records.map((r) => [r.name, r.problems, r.alreadyHere])).toEqual([
      ['Example: fall at work (made up)', [], null],
      ['Second record', [], null],
    ]);
    await to.restoreRecords(checked.records.map((r) => r.restore), checked.personName);

    const before = await contentsOf(from);
    const after = (await contentsOf(to)).filter((r) => r.name !== 'My record');
    expect(after).toEqual(before);
    expect(before[1]!.items.join()).toContain('"private":true');
    expect((await to.getProfile())?.data.personName).toBe('Sam Taylor');
  });

  it('keeps links between entries pointing at the restored entries', async () => {
    const from = await storeWithRecords();
    const to = await freshStore();
    const checked = await checkBackup(await backupOf(from), to);
    if (!checked.ok) throw new Error(checked.reason);
    const [recordId] = await to.restoreRecords(checked.records.map((r) => r.restore));
    const appts = (await to.list(recordId!, 'appointment')) as Item<'appointment'>[];
    const docs = new Set((await to.list(recordId!, 'document')).map((d) => d.id));
    const linked = appts.filter((a) => a.data.documentId);
    expect(linked.length).toBeGreaterThan(0);
    for (const a of linked) expect(docs.has(a.data.documentId!)).toBe(true);
    const note = ((await to.list(recordId!, 'quickNote')) as Item<'quickNote'>[]).find((n) => n.data.photoFileId);
    expect(await to.getFile(note!.data.photoFileId!)).toBeDefined();
  });

  it('on the same device, says the record is already here and adds a copy without touching it', async () => {
    const store = await storeWithRecords();
    const before = await contentsOf(store);
    const checked = await checkBackup(await backupOf(store), store);
    if (!checked.ok) throw new Error(checked.reason);
    expect(checked.records.map((r) => r.alreadyHere)).toEqual(['Example: fall at work (made up)', 'Second record']);
    await store.restoreRecords([{ ...checked.records[1]!.restore, nameSuffix: ' (copy)' }]);
    const after = await contentsOf(store);
    expect(after.slice(0, 2)).toEqual(before);
    expect(after.map((r) => r.name)).toEqual(['Example: fall at work (made up)', 'Second record', 'Second record (copy)']);

    // A restored record is recognised too, if the same backup is restored again.
    const again = await checkBackup(await backupOf(store), store);
    if (!again.ok) throw new Error(again.reason);
    expect(again.records.map((r) => r.alreadyHere)).toEqual(['Example: fall at work (made up)', 'Second record', 'Second record (copy)']);
  });

  it('says what it can’t bring back, rather than leaving it out quietly', async () => {
    const entries = Object.fromEntries(
      Object.entries(unzipSync(new Uint8Array(await (await backupOf(await storeWithRecords())).arrayBuffer()))).filter(
        ([name]) => !name.includes('discharge-letter'),
      ),
    );
    const recordPath = Object.keys(entries).find((k) => k.startsWith('records/1-'))!;
    const record = JSON.parse(strFromU8(entries[recordPath]!));
    record.items.push({ id: 'broken', type: 'appointment', schema: 1, private: false, data: { date: 'not a date' }, createdAt: 'x', updatedAt: 'x' });
    entries[recordPath] = strToU8(JSON.stringify(record));

    const to = await freshStore();
    const checked = await checkBackup(new Blob([zipSync(entries) as BlobPart]), to);
    if (!checked.ok) throw new Error(checked.reason);
    expect(checked.records[0]!.problems).toEqual([
      'The file “discharge-letter.pdf” is missing from the backup. Its entry will be restored without it.',
      'One appointment couldn’t be read, so it will be left out.',
    ]);
    const [recordId] = await to.restoreRecords([checked.records[0]!.restore]);
    const docs = (await to.list(recordId!, 'document')) as Item<'document'>[];
    expect(docs.find((d) => d.data.title === 'Discharge letter')?.data.file).toBeNull();
  });

  it('refuses a file that isn’t a backup, or one from a newer version, and changes nothing', async () => {
    const to = await freshStore();
    expect(await checkBackup(new Blob(['hello']), to)).toEqual({ ok: false, reason: expect.stringContaining('isn’t a Say It Once backup') });
    expect(await checkBackup(new Blob(['PK but not really a zip file at all, just text']), to)).toEqual({
      ok: false,
      reason: expect.stringContaining('isn’t a Say It Once backup'),
    });
    expect(await checkBackup(new Blob([zipSync({ 'notes.txt': strToU8('hello') }) as BlobPart]), to)).toEqual({
      ok: false,
      reason: expect.stringContaining('isn’t a Say It Once backup'),
    });
    const newer = zipSync({ 'manifest.json': strToU8(JSON.stringify({ app: 'Say It Once', format: 99, records: [] })) });
    expect(await checkBackup(new Blob([newer as BlobPart]), to)).toEqual({ ok: false, reason: expect.stringContaining('newer version') });
  });

  it('restores all or nothing', async () => {
    const from = await storeWithRecords();
    const to = await freshStore();
    const checked = await checkBackup(await backupOf(from), to);
    if (!checked.ok) throw new Error(checked.reason);
    const broken = { ...checked.records[1]!.restore, items: [...checked.records[1]!.restore.items, { ...checked.records[1]!.restore.items[0]!, data: {} } as Item] };
    await expect(to.restoreRecords([checked.records[0]!.restore, broken])).rejects.toThrow();
    expect(await to.listRecords()).toHaveLength(0);
  });

  it('says in the file itself that it isn’t encrypted', async () => {
    const entries = unzipSync(new Uint8Array(await (await backupOf(await storeWithRecords())).arrayBuffer()));
    const manifest = JSON.parse(strFromU8(entries['manifest.json']!));
    expect(manifest.about).toContain('not encrypted');
    expect(manifest.records).toHaveLength(2);
  });
});
