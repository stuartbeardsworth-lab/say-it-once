import Dexie from 'dexie';
import { upgrade, type ReadItem } from '../domain/schema';
import {
  currentSchema,
  privateCapable,
  singletonTypes,
  type QuickNoteData,
  type Item,
  type ItemDataMap,
  type ItemType,
  type StoredFileRef,
} from '../domain/types';
import { validate } from '../domain/validate';
import { blank } from '../domain/blank';
import { SayItOnceDb, type LocalRow } from './db';
import { StorageProblem, ValidationProblem, toStorageProblem } from './problems';
import { WriteQueue } from './queue';

// The only way anything reaches storage. The UI calls these methods and
// never touches Dexie itself.
//
// Guarantees (docs/architecture.md, "Local storage and save guarantees"):
// - A method that writes resolves only after the transaction has committed.
//   If it rejects, nothing it was asked to do has happened.
// - Writes go through one queue, one at a time.
// - Nothing falls back to memory, localStorage or anything else.

export const maxFileBytes = 25 * 1024 * 1024;

export type StartupResult = { ok: true } | { ok: false; problem: StorageProblem };

export interface SaveOptions {
  /**
   * The item's ID. If an item with this ID exists it is updated, otherwise
   * it is created with it. A form that saves as the person types gets an ID
   * from newItemId() before its first save, so two quick saves can never
   * create two items.
   */
  id?: string;
  private?: boolean;
}

export interface StorageSpace {
  usedBytes: number | null;
  quotaBytes: number | null;
  /** True when the browser has agreed not to clear this site's data on its own. */
  persisted: boolean | null;
}

/** Reads a file's bytes, turning a failure into a plain explanation. */
async function readBytes(file: Blob): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer();
  } catch (error) {
    throw new StorageProblem('unreadable', error);
  }
}

function now() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

export const newItemId = newId;

/** File IDs an item points at. */
function filesOf(item: Item): string[] {
  if (item.type === 'document') {
    const file = (item as Item<'document'>).data.file;
    return file ? [file.fileId] : [];
  }
  if (item.type === 'quickNote') {
    const photo = (item as Item<'quickNote'>).data.photoFileId;
    return photo ? [photo] : [];
  }
  return [];
}

export class Store {
  readonly db: SayItOnceDb;
  readonly queue = new WriteQueue();
  private persistenceRequested = false;

  constructor(dbName = 'say-it-once') {
    this.db = new SayItOnceDb(dbName);
  }

  // ---- Start-up -------------------------------------------------------------

  /**
   * Opens the database and proves it works by writing, reading and removing
   * a test row. If that fails, every later write is refused with a clear
   * explanation, instead of letting someone type into a void.
   */
  async open(): Promise<StartupResult> {
    try {
      await this.db.open();
      const probe: LocalRow = { key: 'probe', recordId: null, itemId: null, value: now() };
      await this.db.transaction('rw', this.db.local, async () => {
        await this.db.local.put(probe);
        const back = await this.db.local.get('probe');
        if (back?.value !== probe.value) throw new StorageProblem('blocked');
        await this.db.local.delete('probe');
      });
      this.queue.refuse(null);
      await this.removeUnusedFiles();
      return { ok: true };
    } catch (error) {
      const found = toStorageProblem(error);
      const problem = found instanceof StorageProblem ? found : new StorageProblem('unknown', error);
      this.queue.refuse(problem);
      return { ok: false, problem };
    }
  }

  /**
   * A file is saved just before the entry that uses it. If that entry never
   * got saved (the app was closed in between, or the save failed), the file
   * would sit unseen on the device. Removing it here keeps "deleted means
   * deleted" true.
   */
  private async removeUnusedFiles() {
    await this.queue.run(() =>
      this.db.transaction('rw', [this.db.items, this.db.files], async () => {
        const used = new Set((await this.db.items.toArray()).flatMap(filesOf));
        const unused = (await this.db.files.toCollection().primaryKeys()).filter((id) => !used.has(id));
        await this.db.files.bulkDelete(unused);
      }),
    );
  }

  /** For the review page only: behave as if storage had failed at start-up. */
  simulateUnavailable(): { ok: false; problem: StorageProblem } {
    const problem = new StorageProblem('blocked');
    this.queue.refuse(problem);
    return { ok: false, problem };
  }

  /**
   * Returns the record to show. On first use, quietly creates one called
   * "My record" (docs/spec.md, "First open"), with no questions asked.
   */
  async ensureRecord(): Promise<string> {
    // One queued job, so two callers at once can't create two records.
    return this.queue.run(() =>
      this.db.transaction('rw', this.db.items, this.db.local, async () => {
        const remembered = (await this.db.local.get('activeRecordId'))?.value;
        if (typeof remembered === 'string' && (await this.db.items.get(remembered))?.type === 'recordMeta') {
          return remembered;
        }
        const existing = await this.db.items.where('type').equals('recordMeta').first();
        const recordId = existing?.id ?? (await this.addRecord('My record'));
        await this.db.local.put({ key: 'activeRecordId', recordId: null, itemId: null, value: recordId });
        this.requestPersistence();
        return recordId;
      }),
    );
  }

  /** Makes another record the one shown, and remembers the choice. */
  async setActiveRecord(recordId: string): Promise<void> {
    const meta = await this.db.items.get(recordId);
    if (meta?.type !== 'recordMeta') throw new Error(`No record ${recordId}`);
    await this.setPreference('activeRecordId', recordId);
  }

  /** Every record on this device, oldest first. */
  async listRecords(): Promise<Item<'recordMeta'>[]> {
    const rows = await this.db.items.where('type').equals('recordMeta').sortBy('createdAt');
    return rows as Item<'recordMeta'>[];
  }

  /** The profile (the person's name), shared by every record. */
  async getProfile(): Promise<Item<'profile'> | undefined> {
    return (await this.db.items.where('type').equals('profile').first()) as Item<'profile'> | undefined;
  }

  /** The one item of a type that a record has at most one of, if it exists. */
  async getSingleton<T extends 'incident' | 'impactNote' | 'workDetails'>(
    recordId: string,
    type: T,
  ): Promise<Item<T> | undefined> {
    const row = await this.db.items.where('[recordId+type]').equals([recordId, type]).first();
    return row && (upgrade(row).item as Item<T>);
  }

  /** Finds a record to show without writing anything, for when storage is read-only. */
  async findRecord(): Promise<string | null> {
    const remembered = await this.getPreference<string>('activeRecordId');
    if (remembered && (await this.db.items.get(remembered))?.type === 'recordMeta') return remembered;
    return (await this.db.items.where('type').equals('recordMeta').first())?.id ?? null;
  }

  /** Creates a new record. Its recordMeta item's ID is the record's ID. */
  async createRecord(name: string): Promise<string> {
    const id = await this.queue.run(() => this.db.transaction('rw', this.db.items, () => this.addRecord(name)));
    this.requestPersistence();
    return id;
  }

  /** Must run inside a transaction that includes items. */
  private async addRecord(name: string): Promise<string> {
    const data = blank('recordMeta', { name });
    const result = validate('recordMeta', data);
    if (!result.ok) throw new ValidationProblem(result.errors);
    const id = newId();
    const stamp = now();
    await this.db.items.add({
      id,
      recordId: id,
      type: 'recordMeta',
      schema: currentSchema.recordMeta,
      private: false,
      data,
      createdAt: stamp,
      updatedAt: stamp,
    });
    return id;
  }

  // ---- Reading --------------------------------------------------------------

  async get(id: string): Promise<ReadItem | undefined> {
    const stored = await this.db.items.get(id);
    return stored && upgrade(stored);
  }

  /** Every item of one type in a record, oldest first. */
  async list<T extends ItemType>(recordId: string, type: T): Promise<Item<T>[]> {
    const rows = await this.db.items.where('[recordId+type]').equals([recordId, type]).sortBy('createdAt');
    return rows.map((row) => upgrade(row).item as Item<T>);
  }

  /** Every item in a record. */
  async listAll(recordId: string): Promise<Item[]> {
    const rows = await this.db.items.where('recordId').equals(recordId).toArray();
    return rows.map((row) => upgrade(row).item);
  }

  /**
   * Remembers that an entry was opened from Find, on this device only
   * (docs/architecture.md, "Device-only data"). The row names its record and
   * item, so deleting either removes it (D12).
   */
  async noteOpened(recordId: string, itemId: string): Promise<void> {
    const key = `opened:${recordId}:${itemId}`;
    await this.queue.run(() =>
      this.db.transaction('rw', this.db.local, async () => {
        const previous = (await this.db.local.get(key))?.value as { count: number } | undefined;
        await this.db.local.put({ key, recordId, itemId, value: { count: (previous?.count ?? 0) + 1, at: now() } });
      }),
    );
  }

  /** Entries opened from Find in this record: the most recent, and the most often. */
  async openedHistory(recordId: string): Promise<{ recent: string[]; often: string[] }> {
    const rows = await this.db.local.where('recordId').equals(recordId).toArray();
    const opened = rows
      .filter((r) => r.key.startsWith('opened:') && r.itemId)
      .map((r) => ({ itemId: r.itemId as string, ...(r.value as { count: number; at: string }) }));
    const recent = [...opened].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map((o) => o.itemId);
    const often = [...opened]
      .filter((o) => o.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((o) => o.itemId);
    return { recent, often };
  }

  async countItems(recordId: string): Promise<number> {
    return this.db.items.where('recordId').equals(recordId).count();
  }

  /** A stored file, as a Blob of its original bytes and type. */
  async getFile(fileId: string): Promise<{ id: string; name: string; type: string; size: number; blob: Blob } | undefined> {
    const row = await this.db.files.get(fileId);
    if (!row) return undefined;
    return { id: row.id, name: row.name, type: row.type, size: row.size, blob: new Blob([row.bytes], { type: row.type }) };
  }

  // ---- Saving ---------------------------------------------------------------

  /**
   * Creates or updates one item. Rejects with a ValidationProblem listing
   * what to fix, or a StorageProblem saying why it couldn't be kept.
   */
  async save<T extends ItemType>(
    type: T,
    recordId: string | null,
    data: ItemDataMap[T],
    options: SaveOptions = {},
  ): Promise<Item<T>> {
    const isPrivate = options.private ?? false;
    const result = validate(type, data, isPrivate);
    if (!result.ok) throw new ValidationProblem(result.errors);
    if (type !== 'profile' && recordId === null) throw new Error(`${type} items must belong to a record`);

    const saved = await this.queue.run(() =>
      this.db.transaction('rw', this.db.items, this.db.files, async () => {
        const stamp = now();
        const existing = options.id ? await this.db.items.get(options.id) : undefined;
        if (existing && (existing.type !== type || existing.recordId !== recordId)) {
          throw new Error(`Item ${options.id} is not a ${type} in this record`);
        }
        if (existing && existing.schema > currentSchema[type]) {
          throw new Error(`Item ${options.id} was saved by a newer version and is read-only`);
        }
        if (!existing) await this.checkOnlyOne(type, recordId, data);

        const item: Item<T> = {
          id: options.id ?? newId(),
          recordId,
          type,
          schema: currentSchema[type],
          private: privateCapable.has(type) && isPrivate,
          data,
          createdAt: existing?.createdAt ?? stamp,
          updatedAt: stamp,
        };
        await this.db.items.put(item as Item);
        // A photo or file taken off this item goes, unless something else uses it.
        if (existing) await this.removeFilesNoLongerUsed(existing, item as Item);
        return item;
      }),
    );
    this.requestPersistence();
    return saved;
  }

  /**
   * "Something has changed" (docs/spec.md, Impact area): keeps a snapshot of
   * the whole current position (every area and the free-text note, as they
   * are now), then saves the new version of one area or the note, and marks
   * the new position as current from `today`. All in one transaction, so the
   * history is never lost halfway. A correction ("I'm correcting what I
   * wrote") is an ordinary save instead: it overwrites and keeps nothing (Q9).
   */
  async recordChange(
    recordId: string,
    change:
      | { type: 'impactArea'; id: string; data: ItemDataMap['impactArea']; private: boolean }
      | { type: 'impactNote'; id: string; data: ItemDataMap['impactNote']; private: boolean },
    today: string,
  ): Promise<void> {
    const result = validate(change.type, change.data, change.private);
    if (!result.ok) throw new ValidationProblem(result.errors);
    await this.queue.run(() =>
      this.db.transaction('rw', this.db.items, async () => {
        const meta = (await this.db.items.get(recordId)) as Item<'recordMeta'> | undefined;
        if (meta?.type !== 'recordMeta') throw new Error(`No record ${recordId}`);
        const areas = (await this.db.items
          .where('[recordId+type]')
          .equals([recordId, 'impactArea'])
          .toArray()) as Item<'impactArea'>[];
        const note = (await this.db.items.where('[recordId+type]').equals([recordId, 'impactNote']).first()) as
          | Item<'impactNote'>
          | undefined;
        const stamp = now();

        if (areas.length > 0 || note) {
          const earliest = [...areas, ...(note ? [note] : [])].map((i) => i.createdAt.slice(0, 10)).sort()[0] ?? today;
          await this.db.items.add({
            id: newId(),
            recordId,
            type: 'impactSnapshot',
            schema: currentSchema.impactSnapshot,
            private: false,
            data: {
              date: meta.data.impactCurrentSince || earliest,
              areas: areas.map((a) => ({ itemId: a.id, data: a.data })),
              note: note && note.data.text.trim() !== '' ? { itemId: note.id, text: note.data.text } : null,
            },
            createdAt: stamp,
            updatedAt: stamp,
          });
        }

        const existing = await this.db.items.get(change.id);
        if (!existing && change.type === 'impactArea' && areas.some((a) => a.data.areaKey === change.data.areaKey)) {
          throw new Error(`This record already has the ${change.data.areaKey} area; update it instead`);
        }
        if (!existing && change.type === 'impactNote' && note) throw new Error('This record already has a note');
        await this.db.items.put({
          id: change.id,
          recordId,
          type: change.type,
          schema: currentSchema[change.type],
          private: change.private,
          data: change.data,
          createdAt: existing?.createdAt ?? stamp,
          updatedAt: stamp,
        } as Item);
        await this.db.items.put({ ...meta, data: { ...meta.data, impactCurrentSince: today }, updatedAt: stamp });
      }),
    );
  }

  /**
   * Saves a document together with a new file for it, in one transaction:
   * both are kept or neither is. Pass no file to keep the document's
   * current one.
   */
  async saveDocument(
    recordId: string,
    id: string,
    data: ItemDataMap['document'],
    isPrivate: boolean,
    newFile?: { blob: Blob; name: string },
  ): Promise<Item<'document'>> {
    if (newFile && newFile.blob.size > maxFileBytes) throw new StorageProblem('too-large');
    const fileRef = newFile ? this.fileRefFor(newFile) : null;
    const withFile = fileRef ? { ...data, file: fileRef } : data;
    const result = validate('document', withFile, isPrivate);
    if (!result.ok) throw new ValidationProblem(result.errors);
    const bytes = newFile ? await readBytes(newFile.blob) : null;
    const saved = await this.queue.run(() =>
      this.db.transaction('rw', this.db.items, this.db.files, async () => {
        if (bytes && fileRef) await this.addFileRow(recordId, fileRef, bytes);
        return this.putItem('document', recordId, id, withFile, isPrivate);
      }),
    );
    this.requestPersistence();
    return saved;
  }

  /**
   * Saves an appointment, and when a letter is attached, the letter as a
   * document titled "Appointment letter — {organisation}", all in one
   * transaction. A new letter starts with the appointment's private
   * setting and then has its own (decision Q10).
   */
  async saveAppointment(
    recordId: string,
    id: string,
    data: ItemDataMap['appointment'],
    isPrivate: boolean,
    letter?: { blob: Blob; name: string },
  ): Promise<Item<'appointment'>> {
    const result = validate('appointment', data, isPrivate);
    if (!result.ok) throw new ValidationProblem(result.errors);
    if (letter && letter.blob.size > maxFileBytes) throw new StorageProblem('too-large');
    const letterBytes = letter ? await readBytes(letter.blob) : null;
    const saved = await this.queue.run(() =>
      this.db.transaction('rw', this.db.items, this.db.files, async () => {
        let documentId = data.documentId;
        if (letter && letterBytes) {
          const ref = this.fileRefFor(letter);
          await this.addFileRow(recordId, ref, letterBytes);
          const existingDoc = documentId ? ((await this.db.items.get(documentId)) as Item<'document'> | undefined) : undefined;
          const docData = blank('document', {
            ...(existingDoc?.data ?? {}),
            title: existingDoc?.data.title || `Appointment letter — ${data.organisation.trim()}`,
            date: existingDoc?.data.date || data.date,
            from: existingDoc?.data.from || data.organisation.trim(),
            relatedTo: { section: 'appointments', itemId: id },
            file: ref,
          });
          const doc = await this.putItem('document', recordId, existingDoc?.id ?? newId(), docData, existingDoc?.private ?? isPrivate);
          documentId = doc.id;
        }
        return this.putItem('appointment', recordId, id, { ...data, documentId }, isPrivate);
      }),
    );
    this.requestPersistence();
    return saved;
  }

  private fileRefFor(file: { blob: Blob; name: string }): StoredFileRef {
    return { fileId: newId(), name: file.name, type: file.blob.type, size: file.blob.size };
  }

  private async addFileRow(recordId: string, ref: StoredFileRef, bytes: ArrayBuffer) {
    await this.db.files.add({ id: ref.fileId, recordId, bytes, name: ref.name, type: ref.type, size: ref.size, createdAt: now() });
  }

  /** Must run inside a transaction on items and files. Creates or updates. */
  private async putItem<T extends ItemType>(
    type: T,
    recordId: string,
    id: string,
    data: ItemDataMap[T],
    isPrivate: boolean,
  ): Promise<Item<T>> {
    const existing = await this.db.items.get(id);
    if (existing && (existing.type !== type || existing.recordId !== recordId)) {
      throw new Error(`Item ${id} is not a ${type} in this record`);
    }
    const stamp = now();
    const item: Item<T> = {
      id,
      recordId,
      type,
      schema: currentSchema[type],
      private: privateCapable.has(type) && isPrivate,
      data,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    await this.db.items.put(item as Item);
    if (existing) await this.removeFilesNoLongerUsed(existing, item as Item);
    return item;
  }

  private async removeFilesNoLongerUsed(before: Item, after: Item) {
    const kept = new Set(filesOf(after));
    const dropped = filesOf(before).filter((f) => !kept.has(f));
    if (dropped.length === 0 || before.recordId === null) return;
    const stillUsed = new Set(
      (await this.db.items.where('recordId').equals(before.recordId).toArray()).flatMap(filesOf),
    );
    await this.db.files.bulkDelete(dropped.filter((f) => !stillUsed.has(f)));
  }

  /**
   * Files a Quick Note in a section, or unfiles it (null). Filing a note
   * with a photo in Letters & documents or Appointments also makes the
   * photo into a document (decision Q1), once, in the same transaction, so
   * both happen or neither does. The document starts with the note's
   * private setting.
   */
  async fileQuickNote(noteId: string, filedTo: QuickNoteData['filedTo']): Promise<void> {
    await this.queue.run(() =>
      this.db.transaction('rw', this.db.items, this.db.files, async () => {
        const note = (await this.db.items.get(noteId)) as Item<'quickNote'> | undefined;
        if (note?.type !== 'quickNote' || note.recordId === null) throw new Error(`No Quick Note ${noteId}`);
        const data: QuickNoteData = { ...note.data, filedTo };
        const result = validate('quickNote', data, note.private);
        if (!result.ok) throw new ValidationProblem(result.errors);
        const stamp = now();
        await this.db.items.put({ ...note, data, updatedAt: stamp });

        const photoId = note.data.photoFileId;
        if (!photoId || (filedTo?.section !== 'documents' && filedTo?.section !== 'appointments')) return;
        const docs = (await this.db.items
          .where('[recordId+type]')
          .equals([note.recordId, 'document'])
          .toArray()) as Item<'document'>[];
        if (docs.some((d) => d.data.file?.fileId === photoId)) return;
        const file = await this.db.files.get(photoId);
        if (!file) return;
        await this.db.items.add({
          id: newId(),
          recordId: note.recordId,
          type: 'document',
          schema: currentSchema.document,
          private: note.private,
          data: blank('document', {
            title: 'Photo from a Quick Note',
            date: note.createdAt.slice(0, 10),
            relatedTo: { section: filedTo.section, itemId: null },
            file: { fileId: file.id, name: file.name, type: file.type, size: file.size },
          }),
          createdAt: stamp,
          updatedAt: stamp,
        });
      }),
    );
  }

  /** Some items are one per record, and there is one area of each kind. */
  private async checkOnlyOne<T extends ItemType>(type: T, recordId: string | null, data: ItemDataMap[T]) {
    if (singletonTypes.has(type)) {
      const others =
        recordId === null
          ? await this.db.items.where('type').equals(type).count()
          : await this.db.items.where('[recordId+type]').equals([recordId, type]).count();
      if (others > 0) throw new Error(`This record already has a ${type}; update it instead`);
    }
    if (type === 'impactArea' && recordId !== null) {
      const key = (data as ItemDataMap['impactArea']).areaKey;
      const areas = await this.db.items.where('[recordId+type]').equals([recordId, 'impactArea']).toArray();
      if (areas.some((a) => (a as Item<'impactArea'>).data.areaKey === key)) {
        throw new Error(`This record already has the ${key} area; update it instead`);
      }
    }
  }

  /** Keeps a file (a letter, a photo) exactly as given. */
  async saveFile(recordId: string, file: Blob, name: string): Promise<StoredFileRef> {
    if (file.size > maxFileBytes) throw new StorageProblem('too-large');
    const ref: StoredFileRef = { fileId: newId(), name, type: file.type, size: file.size };
    // Read the bytes before the transaction: a transaction can't wait on anything else.
    const bytes = await readBytes(file);
    await this.queue.run(() =>
      this.db.files.add({
        id: ref.fileId,
        recordId,
        bytes,
        name,
        type: file.type,
        size: file.size,
        createdAt: now(),
      }),
    );
    this.requestPersistence();
    return ref;
  }

  // ---- Deleting -------------------------------------------------------------

  /**
   * Deletes an item and every trace of it (docs/architecture.md, "Deletion"):
   * its device-only rows, its files unless another item still uses them,
   * links to it from other items, and its copies inside impact snapshots.
   * For an appointment, `alsoDeleteLetter` deletes the letter saved with it
   * (decision Q6: the person is asked, and the default is to keep it).
   */
  async deleteItem(id: string, options: { alsoDeleteLetter?: boolean } = {}): Promise<void> {
    await this.queue.run(() =>
      this.db.transaction('rw', [this.db.items, this.db.files, this.db.local], async () => {
        const item = await this.db.items.get(id);
        if (!item) return;
        if (item.type === 'recordMeta') throw new Error('Delete a record with deleteRecord');
        const ids = [id];
        if (item.type === 'appointment' && options.alsoDeleteLetter) {
          const letter = (item as Item<'appointment'>).data.documentId;
          if (letter) ids.push(letter);
        }
        await this.removeItems(ids);
      }),
    );
  }

  private async removeItems(ids: string[]) {
    const removed = (await this.db.items.bulkGet(ids)).filter((i): i is Item => i !== undefined);
    if (removed.length === 0) return;
    const gone = new Set(removed.map((i) => i.id));
    await this.db.items.bulkDelete([...gone]);
    await this.db.local.where('itemId').anyOf([...gone]).delete();

    const recordIds = [...new Set(removed.map((i) => i.recordId).filter((r): r is string => r !== null))];
    for (const recordId of recordIds) {
      const others = await this.db.items.where('recordId').equals(recordId).toArray();
      for (const other of others) {
        const cleaned = withoutLinksTo(other, gone);
        if (cleaned === 'delete') await this.db.items.delete(other.id);
        else if (cleaned) await this.db.items.put({ ...cleaned, updatedAt: now() });
      }
      // A file goes when nothing in the record points at it any more.
      const stillUsed = new Set(
        (await this.db.items.where('recordId').equals(recordId).toArray()).flatMap(filesOf),
      );
      const candidates = removed.flatMap(filesOf).filter((f) => !stillUsed.has(f));
      await this.db.files.bulkDelete(candidates);
    }
  }

  /** Deletes a record and everything in it. The last record can't be deleted. */
  async deleteRecord(recordId: string): Promise<void> {
    await this.queue.run(() =>
      this.db.transaction('rw', [this.db.items, this.db.files, this.db.local], async () => {
        const records = await this.db.items.where('type').equals('recordMeta').count();
        if (records <= 1) throw new Error('The last record cannot be deleted; delete everything instead');
        await this.db.items.where('recordId').equals(recordId).delete();
        await this.db.files.where('recordId').equals(recordId).delete();
        await this.db.local.where('recordId').equals(recordId).delete();
        const active = await this.db.local.get('activeRecordId');
        if (active?.value === recordId) await this.db.local.delete('activeRecordId');
      }),
    );
  }

  /** Deletes the whole database on this device, then starts again empty. */
  async deleteEverything(): Promise<void> {
    await this.queue.run(async () => {
      this.db.close();
      await Dexie.delete(this.db.name);
      await this.db.open();
    });
  }

  // ---- Device-only preferences ----------------------------------------------

  async getPreference<T>(key: string): Promise<T | undefined> {
    return (await this.db.local.get(key))?.value as T | undefined;
  }

  async setPreference(key: string, value: unknown): Promise<void> {
    await this.queue.run(() => this.db.local.put({ key, recordId: null, itemId: null, value }));
  }

  // ---- Keeping the record safe ----------------------------------------------

  /**
   * After the first save, ask the browser to keep this site's data even when
   * space runs low. The browser decides; the answer is shown in Privacy &
   * backup. Asking never blocks or fails a save.
   */
  private requestPersistence() {
    if (this.persistenceRequested) return;
    this.persistenceRequested = true;
    void navigator.storage?.persist?.().catch(() => undefined);
  }

  async space(): Promise<StorageSpace> {
    const storage = navigator.storage as StorageManager | undefined;
    const [estimate, persisted] = await Promise.all([
      storage?.estimate?.().catch(() => undefined),
      storage?.persisted?.().catch(() => undefined),
    ]);
    return {
      usedBytes: estimate?.usage ?? null,
      quotaBytes: estimate?.quota ?? null,
      persisted: persisted ?? null,
    };
  }
}

/**
 * Removes references to deleted items from one item. Returns the changed
 * item, 'delete' for a snapshot with nothing left in it, or null if the
 * item doesn't mention any of them.
 */
function withoutLinksTo(item: Item, gone: Set<string>): Item | 'delete' | null {
  switch (item.type) {
    case 'appointment':
    case 'cost': {
      const data = (item as Item<'appointment' | 'cost'>).data;
      if (data.documentId && gone.has(data.documentId)) {
        return { ...item, data: { ...data, documentId: null } } as Item;
      }
      return null;
    }
    case 'document': {
      const data = (item as Item<'document'>).data;
      if (data.relatedTo?.itemId && gone.has(data.relatedTo.itemId)) {
        return { ...item, data: { ...data, relatedTo: { section: data.relatedTo.section, itemId: null } } } as Item;
      }
      return null;
    }
    case 'impactSnapshot': {
      const data = (item as Item<'impactSnapshot'>).data;
      const areas = data.areas.filter((a) => !gone.has(a.itemId));
      const note = data.note && gone.has(data.note.itemId) ? null : data.note;
      if (areas.length === data.areas.length && note === data.note) return null;
      if (areas.length === 0 && note === null) return 'delete';
      return { ...item, data: { ...data, areas, note } } as Item;
    }
    default:
      return null;
  }
}
