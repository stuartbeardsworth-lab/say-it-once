// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { blank } from '../domain/blank';
import type { Item } from '../domain/types';
import { StorageProblem, ValidationProblem } from './problems';
import { maxFileBytes } from './store';
import { freshStore } from './testing';

describe('start-up', () => {
  it('opens, passes the storage check and creates "My record" once', async () => {
    const store = await freshStore();
    const first = await store.ensureRecord();
    const again = await store.ensureRecord();
    expect(again).toBe(first);
    const meta = await store.get(first);
    expect(meta?.item.type).toBe('recordMeta');
    expect((meta?.item as Item<'recordMeta'>).data.name).toBe('My record');
    expect(await store.db.local.get('probe')).toBeUndefined();
  });

  it('refuses every write, with an explanation, when storage is unavailable', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    store.simulateUnavailable();
    await expect(store.save('quickNote', recordId, blank('quickNote', { text: 'hello' }))).rejects.toMatchObject({
      kind: 'blocked',
    });
    expect(await store.list(recordId, 'quickNote')).toHaveLength(0);
  });
});

describe('saving', () => {
  it('saves only after the transaction commits, and reads back the same', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const saved = await store.save('appointment', recordId, blank('appointment', { date: '2026-03-14', organisation: 'St Mary’s' }));
    const back = await store.get(saved.id);
    expect(back?.item).toEqual(saved);
    expect(saved.schema).toBe(1);
    expect(saved.private).toBe(false);
  });

  it('updates an existing item, keeping its created time', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const first = await store.save('quickNote', recordId, blank('quickNote', { text: 'one' }));
    const second = await store.save('quickNote', recordId, blank('quickNote', { text: 'two' }), { id: first.id, private: true });
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.private).toBe(true);
    expect(await store.list(recordId, 'quickNote')).toHaveLength(1);
  });

  it('refuses incomplete entries with plain messages and stores nothing', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const attempt = store.save('appointment', recordId, blank('appointment'));
    await expect(attempt).rejects.toBeInstanceOf(ValidationProblem);
    await attempt.catch((e: ValidationProblem) => {
      expect(e.errors.date).toBe('Add the date of the appointment.');
      expect(e.errors.organisation).toBe('Add who the appointment is with.');
    });
    expect(await store.list(recordId, 'appointment')).toHaveLength(0);
  });

  it('never marks an item private if its type has no private control', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    await expect(store.save('incident', recordId, blank('incident'), { private: true })).rejects.toBeInstanceOf(
      ValidationProblem,
    );
  });

  it('keeps one incident per record and one of each impact area', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    // Forms never do this, so the person sees the general message; the
    // reason is kept on the error for whoever is fixing the bug.
    const alreadyHas = { kind: 'unknown', cause: expect.objectContaining({ message: expect.stringMatching(/already has/) }) };
    await store.save('incident', recordId, blank('incident', { what: 'Fell' }));
    await expect(store.save('incident', recordId, blank('incident'))).rejects.toMatchObject(alreadyHas);
    await store.save('impactArea', recordId, blank('impactArea', { areaKey: 'wash', detail: 'Need help' }));
    await expect(
      store.save('impactArea', recordId, blank('impactArea', { areaKey: 'wash', detail: 'again' })),
    ).rejects.toMatchObject(alreadyHas);
    expect(await store.list(recordId, 'impactArea')).toHaveLength(1);
  });

  it('writes in the order they were asked for, even when fired without waiting', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const note = await store.save('quickNote', recordId, blank('quickNote', { text: 'v0' }));
    const writes = Array.from({ length: 20 }, (_, i) =>
      store.save('quickNote', recordId, blank('quickNote', { text: `v${i + 1}` }), { id: note.id }),
    );
    await Promise.all(writes);
    const [latest] = await store.list(recordId, 'quickNote');
    expect(latest?.data.text).toBe('v20');
  });

  it('reports a failed write and carries on with the next one', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    store.queue.simulateNextFailure('full');
    const failed = store.save('quickNote', recordId, blank('quickNote', { text: 'lost?' }));
    const next = store.save('quickNote', recordId, blank('quickNote', { text: 'kept' }));
    await expect(failed).rejects.toMatchObject({ kind: 'full' });
    await expect(failed).rejects.toBeInstanceOf(StorageProblem);
    await expect(next).resolves.toMatchObject({ data: { text: 'kept' } });
    const notes = await store.list(recordId, 'quickNote');
    expect(notes.map((n) => n.data.text)).toEqual(['kept']);
  });

  it('refuses files over 25 MB without storing anything', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const big = new Blob([new Uint8Array(maxFileBytes + 1)]);
    await expect(store.saveFile(recordId, big, 'scan.pdf')).rejects.toMatchObject({ kind: 'too-large' });
    expect(await store.db.files.count()).toBe(0);
  });

  it('keeps a file exactly as given', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const ref = await store.saveFile(recordId, new Blob(['%PDF-1.7 letter'], { type: 'application/pdf' }), 'letter.pdf');
    const row = await store.getFile(ref.fileId);
    expect(row?.name).toBe('letter.pdf');
    expect(await row?.blob.text()).toBe('%PDF-1.7 letter');
  });

  it('remembers device preferences', async () => {
    const store = await freshStore();
    await store.setPreference('textSize', 'largest');
    expect(await store.getPreference('textSize')).toBe('largest');
  });
});

describe('several things at once', () => {
  it('two start-ups at the same moment create only one record', async () => {
    const store = await freshStore();
    const [a, b] = await Promise.all([store.ensureRecord(), store.ensureRecord()]);
    expect(a).toBe(b);
    expect(await store.db.items.where('type').equals('recordMeta').count()).toBe(1);
  });

  it('two quick saves of a new note with a chosen ID make one note', async () => {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const { newItemId } = await import('./store');
    const id = newItemId();
    await Promise.all([
      store.save('quickNote', recordId, blank('quickNote', { text: 'Hel' }), { id }),
      store.save('quickNote', recordId, blank('quickNote', { text: 'Hello' }), { id }),
    ]);
    const notes = await store.list(recordId, 'quickNote');
    expect(notes.map((n) => n.data.text)).toEqual(['Hello']);
  });
});

describe('Quick Notes', () => {
  async function noteWithPhoto(isPrivate = false) {
    const store = await freshStore();
    const recordId = await store.ensureRecord();
    const photo = await store.saveFile(recordId, new Blob(['jpeg'], { type: 'image/jpeg' }), 'photo.jpg');
    const note = await store.save('quickNote', recordId, blank('quickNote', { text: 'Letter from the clinic', photoFileId: photo.fileId }), {
      private: isPrivate,
    });
    return { store, recordId, photo, note };
  }

  it('filing a photo note in Letters & documents makes one document, with the note’s private setting', async () => {
    const { store, recordId, photo, note } = await noteWithPhoto(true);
    await store.fileQuickNote(note.id, { section: 'documents', impactArea: null });
    await store.fileQuickNote(note.id, { section: 'documents', impactArea: null });
    const docs = await store.list(recordId, 'document');
    expect(docs).toHaveLength(1);
    expect(docs[0]?.data.file?.fileId).toBe(photo.fileId);
    expect(docs[0]?.private).toBe(true);
    expect(((await store.get(note.id))?.item as Item<'quickNote'>).data.filedTo?.section).toBe('documents');
  });

  it('filing elsewhere makes no document, and unfiling works', async () => {
    const { store, recordId, note } = await noteWithPhoto();
    await store.fileQuickNote(note.id, { section: 'impact', impactArea: 'wash' });
    expect(await store.list(recordId, 'document')).toHaveLength(0);
    await store.fileQuickNote(note.id, null);
    expect(((await store.get(note.id))?.item as Item<'quickNote'>).data.filedTo).toBeNull();
  });

  it('removing a photo from a note deletes the photo, unless it became a document', async () => {
    const { store, recordId, photo, note } = await noteWithPhoto();
    await store.save('quickNote', recordId, { ...note.data, photoFileId: null }, { id: note.id });
    expect(await store.getFile(photo.fileId)).toBeUndefined();

    const second = await noteWithPhoto();
    await second.store.fileQuickNote(second.note.id, { section: 'documents', impactArea: null });
    await second.store.save('quickNote', second.recordId, { ...second.note.data, photoFileId: null }, { id: second.note.id });
    expect(await second.store.getFile(second.photo.fileId)).toBeDefined();
  });
});

describe('records', () => {
  it('lists records, switches between them and remembers the choice', async () => {
    const store = await freshStore();
    const first = await store.ensureRecord();
    const second = await store.createRecord('Second injury');
    expect((await store.listRecords()).map((r) => r.data.name)).toEqual(['My record', 'Second injury']);
    await store.setActiveRecord(second);
    expect(await store.ensureRecord()).toBe(second);
    await store.setActiveRecord(first);
    expect(await store.ensureRecord()).toBe(first);
  });
});
