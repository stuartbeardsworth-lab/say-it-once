import Dexie, { type EntityTable } from 'dexie';
import type { Item } from '../domain/types';

// The database on this device (docs/architecture.md, "Local storage and
// save guarantees"). Tables for sync (outbox, keys) and the sync fields on
// items are added by a later version when sync is built, in Stages 7 to 9.

export interface FileRow {
  id: string;
  recordId: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

/** Device-only data that is never synced: preferences, search history. */
export interface LocalRow {
  key: string;
  /** Set when the row belongs to one record, so deleting the record removes it. */
  recordId: string | null;
  /** Set when the row mentions one item, so deleting the item removes it. */
  itemId: string | null;
  value: unknown;
}

export class SayItOnceDb extends Dexie {
  items!: EntityTable<Item, 'id'>;
  files!: EntityTable<FileRow, 'id'>;
  local!: EntityTable<LocalRow, 'key'>;

  constructor(name = 'say-it-once') {
    super(name);
    this.version(1).stores({
      items: 'id, recordId, type, [recordId+type]',
      files: 'id, recordId',
      local: 'key, recordId, itemId',
    });
  }
}
