// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { blank } from '../domain/blank';
import type { Item } from '../domain/types';
import type { Store } from './store';
import { freshStore } from './testing';

// One test per row of the Deletion table in docs/architecture.md: after
// deleting, no row, file, or device-only entry for the item remains.

async function setup() {
  const store = await freshStore();
  const recordId = await store.ensureRecord();
  return { store, recordId };
}

async function addDocumentWithFile(store: Store, recordId: string, title = 'Letter') {
  const file = await store.saveFile(recordId, new Blob(['letter bytes'], { type: 'application/pdf' }), `${title}.pdf`);
  const doc = await store.save('document', recordId, blank('document', { title, file }), { private: true });
  return { doc, file };
}

async function addSearchEntry(store: Store, recordId: string, itemId: string) {
  await store.db.local.put({ key: `search:${itemId}`, recordId, itemId, value: { opened: 3 } });
}

describe('deleting', () => {
  it('any item: removes its row and its search-history entries', async () => {
    const { store, recordId } = await setup();
    const contact = await store.save('contact', recordId, blank('contact', { organisation: 'Headway' }));
    await addSearchEntry(store, recordId, contact.id);
    await store.deleteItem(contact.id);
    expect(await store.get(contact.id)).toBeUndefined();
    expect(await store.db.local.where('itemId').equals(contact.id).count()).toBe(0);
  });

  it('any item: forgets that it was in a shared report', async () => {
    const { store, recordId } = await setup();
    const a = await store.save('contact', recordId, blank('contact', { organisation: 'Headway' }));
    const b = await store.save('contact', recordId, blank('contact', { organisation: 'GP' }));
    expect(await store.lastShared(recordId, [a.id])).toBeNull();
    await store.noteShared(recordId, [a.id, b.id]);
    expect(await store.lastShared(recordId, [a.id])).not.toBeNull();
    expect(await store.lastShared(recordId)).not.toBeNull();
    await store.deleteItem(a.id);
    expect(await store.db.local.where('itemId').equals(a.id).count()).toBe(0);
    expect(await store.lastShared(recordId, [a.id])).toBeNull();
    expect(await store.lastShared(recordId, [b.id])).not.toBeNull();
  });

  it('document: removes its file and unlinks appointments and costs', async () => {
    const { store, recordId } = await setup();
    const { doc, file } = await addDocumentWithFile(store, recordId);
    const appt = await store.save('appointment', recordId, blank('appointment', { date: '2026-03-14', organisation: 'GP', documentId: doc.id }));
    const cost = await store.save('cost', recordId, blank('cost', { date: '2026-03-14', item: 'Taxi', amountPence: 1250, documentId: doc.id }));
    await store.deleteItem(doc.id);
    expect(await store.get(doc.id)).toBeUndefined();
    expect(await store.getFile(file.fileId)).toBeUndefined();
    expect(((await store.get(appt.id))?.item as Item<'appointment'>).data.documentId).toBeNull();
    expect(((await store.get(cost.id))?.item as Item<'cost'>).data.documentId).toBeNull();
  });

  it('appointment: keeps its letter by default', async () => {
    const { store, recordId } = await setup();
    const { doc, file } = await addDocumentWithFile(store, recordId);
    const appt = await store.save('appointment', recordId, blank('appointment', { date: '2026-03-14', organisation: 'GP', documentId: doc.id }));
    await store.deleteItem(appt.id);
    expect(await store.get(appt.id)).toBeUndefined();
    expect(await store.get(doc.id)).toBeDefined();
    expect(await store.getFile(file.fileId)).toBeDefined();
  });

  it('appointment: deletes the letter and its file too when asked', async () => {
    const { store, recordId } = await setup();
    const { doc, file } = await addDocumentWithFile(store, recordId);
    const appt = await store.save('appointment', recordId, blank('appointment', { date: '2026-03-14', organisation: 'GP', documentId: doc.id }));
    await store.deleteItem(appt.id, { alsoDeleteLetter: true });
    expect(await store.get(doc.id)).toBeUndefined();
    expect(await store.getFile(file.fileId)).toBeUndefined();
  });

  it('quick note: removes its photo', async () => {
    const { store, recordId } = await setup();
    const photo = await store.saveFile(recordId, new Blob(['jpeg'], { type: 'image/jpeg' }), 'photo.jpg');
    const note = await store.save('quickNote', recordId, blank('quickNote', { photoFileId: photo.fileId }));
    await store.deleteItem(note.id);
    expect(await store.getFile(photo.fileId)).toBeUndefined();
  });

  it('quick note: keeps the photo if it was already made into a document', async () => {
    const { store, recordId } = await setup();
    const photo = await store.saveFile(recordId, new Blob(['jpeg'], { type: 'image/jpeg' }), 'photo.jpg');
    const note = await store.save('quickNote', recordId, blank('quickNote', { photoFileId: photo.fileId }));
    await store.save('document', recordId, blank('document', { title: 'Photo', file: photo }));
    await store.deleteItem(note.id);
    expect(await store.getFile(photo.fileId)).toBeDefined();
  });

  it('impact area or note: removes its copies from every snapshot', async () => {
    const { store, recordId } = await setup();
    const wash = await store.save('impactArea', recordId, blank('impactArea', { areaKey: 'wash', detail: 'SECRET-WASH' }));
    const move = await store.save('impactArea', recordId, blank('impactArea', { areaKey: 'move', detail: 'stairs' }));
    const note = await store.save('impactNote', recordId, { text: 'SECRET-NOTE' });
    const both = await store.save('impactSnapshot', recordId, {
      date: '2026-01-01',
      areas: [{ itemId: wash.id, data: wash.data }, { itemId: move.id, data: move.data }],
      note: { itemId: note.id, text: note.data.text },
    });
    const onlyWash = await store.save('impactSnapshot', recordId, {
      date: '2026-02-01',
      areas: [{ itemId: wash.id, data: wash.data }],
      note: null,
    });

    await store.deleteItem(wash.id);
    await store.deleteItem(note.id);

    const kept = (await store.get(both.id))?.item as Item<'impactSnapshot'>;
    expect(kept.data.areas.map((a) => a.itemId)).toEqual([move.id]);
    expect(kept.data.note).toBeNull();
    expect(await store.get(onlyWash.id)).toBeUndefined();
    const everything = JSON.stringify(await store.db.items.toArray());
    expect(everything).not.toContain('SECRET-WASH');
    expect(everything).not.toContain('SECRET-NOTE');
  });

  it('a document that pointed at a deleted item keeps only its section', async () => {
    const { store, recordId } = await setup();
    const treat = await store.save('treatment', recordId, blank('treatment', { name: 'Physio' }));
    const doc = await store.save('document', recordId, blank('document', { title: 'Referral', relatedTo: { section: 'treatment', itemId: treat.id } }));
    await store.deleteItem(treat.id);
    expect(((await store.get(doc.id))?.item as Item<'document'>).data.relatedTo).toEqual({ section: 'treatment', itemId: null });
  });

  it('record: removes every item, file and device-only entry in it, and nothing else', async () => {
    const { store, recordId: first } = await setup();
    const second = await store.createRecord('Second injury');
    const { doc } = await addDocumentWithFile(store, second);
    await addSearchEntry(store, second, doc.id);
    await store.save('quickNote', first, blank('quickNote', { text: 'keep me' }));

    await store.deleteRecord(second);

    expect(await store.db.items.where('recordId').equals(second).count()).toBe(0);
    expect(await store.db.files.where('recordId').equals(second).count()).toBe(0);
    expect(await store.db.local.where('recordId').equals(second).count()).toBe(0);
    expect(await store.list(first, 'quickNote')).toHaveLength(1);
  });

  it('record: the last one cannot be deleted on its own', async () => {
    const { store, recordId } = await setup();
    await expect(store.deleteRecord(recordId)).rejects.toThrow();
    expect(await store.get(recordId)).toBeDefined();
  });

  it('everything: leaves an empty database', async () => {
    const { store, recordId } = await setup();
    await addDocumentWithFile(store, recordId);
    await store.setPreference('textSize', 'large');
    await store.deleteEverything();
    expect(await store.db.items.count()).toBe(0);
    expect(await store.db.files.count()).toBe(0);
    expect(await store.db.local.count()).toBe(0);
  });

  it('a file whose entry was never saved is removed at the next start-up', async () => {
    const { store, recordId } = await setup();
    const orphan = await store.saveFile(recordId, new Blob(['x']), 'orphan.jpg');
    const { file: used } = await addDocumentWithFile(store, recordId);
    await store.open();
    expect(await store.getFile(orphan.fileId)).toBeUndefined();
    expect(await store.getFile(used.fileId)).toBeDefined();
  });
});
