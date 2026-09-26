import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { upgrade } from '../../domain/schema';
import { currentSchema, type Item, type ItemType } from '../../domain/types';
import { validate } from '../../domain/validate';
import { appVersion } from '../../buildInfo';
import type { RestoreRecord, Store } from '../../store/store';

// The backup file (docs/architecture.md, "Export from the new app"): a zip
// holding a readable manifest.json, one JSON file per record, and every
// original file. It is the person's own copy, so it holds everything,
// including entries marked private, and it is not encrypted. It says so,
// in the manifest and on screen.

export const backupFormat = 1;

const warning =
  'This is a Say It Once backup. It is not encrypted: anyone who has this file can read everything in it, including entries marked "Keep this private". Keep it somewhere safe.';

interface ManifestRecord {
  id: string;
  name: string;
  file: string;
  entries: number;
  files: number;
}

interface Manifest {
  about: string;
  app: 'Say It Once';
  format: number;
  /** The version of Say It Once that made it. */
  appVersion?: string;
  createdAt: string;
  personName: string;
  records: ManifestRecord[];
}

interface RecordFile {
  record: Item<'recordMeta'>;
  items: Item[];
  files: { fileId: string; name: string; type: string; size: number; createdAt: string; path: string }[];
}

function slug(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[^\w\s.-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'file'
  );
}

/** Makes the backup file. Files are read and written one at a time. */
export async function makeBackup(store: Store, createdAt: string): Promise<Blob> {
  const contents = await store.backupContents();
  const chunks: Uint8Array[] = [];
  let finished!: (blob: Blob) => void;
  let failed!: (error: unknown) => void;
  const done = new Promise<Blob>((resolve, reject) => {
    finished = resolve;
    failed = reject;
  });
  const zip = new Zip((error, data, final) => {
    if (error) return failed(error);
    chunks.push(data);
    if (final) finished(new Blob(chunks as BlobPart[], { type: 'application/zip' }));
  });
  const add = (path: string, bytes: Uint8Array, compress: boolean) => {
    const entry = compress ? new ZipDeflate(path, { level: 6 }) : new ZipPassThrough(path);
    zip.add(entry);
    entry.push(bytes, true);
  };

  const manifest: Manifest = {
    about: warning,
    app: 'Say It Once',
    format: backupFormat,
    appVersion,
    createdAt,
    personName: contents.profile?.data.personName ?? '',
    records: [],
  };
  for (const [index, r] of contents.records.entries()) {
    const file = `records/${index + 1}-${slug(r.meta.data.name)}.json`;
    const files: RecordFile['files'] = [];
    for (const f of r.files) {
      const bytes = await store.fileBytes(f.id);
      if (!bytes) throw new Error(`The file ${f.name} couldn’t be read`);
      const path = `files/${f.id}-${slug(f.name)}`;
      add(path, new Uint8Array(bytes), false);
      files.push({ fileId: f.id, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt, path });
    }
    const recordFile: RecordFile = { record: r.meta, items: r.items, files };
    add(file, strToU8(JSON.stringify(recordFile, null, 2)), true);
    manifest.records.push({ id: r.meta.id, name: r.meta.data.name, file, entries: r.items.length, files: files.length });
  }
  add('manifest.json', strToU8(JSON.stringify(manifest, null, 2)), true);
  zip.end();
  return done;
}

export function backupFileName(createdAt: string): string {
  return `Say It Once backup ${createdAt.slice(0, 10)}.zip`;
}

// ---- Reading a backup ---------------------------------------------------------

export interface CheckedRecord {
  restore: RestoreRecord;
  name: string;
  entries: number;
  files: number;
  /** Anything that can't be brought back, in plain words. Never skipped silently. */
  problems: string[];
  /** The name of the same record already on this device, if it is. */
  alreadyHere: string | null;
}

export type CheckedBackup =
  | { ok: true; createdAt: string; personName: string; records: CheckedRecord[] }
  | { ok: false; reason: string };

const notABackup = 'This file isn’t a Say It Once backup, or it has been damaged. Nothing has been changed.';

const kindWords: Partial<Record<ItemType, string>> = {
  appointment: 'appointment',
  document: 'letter or document',
  cost: 'cost',
  contact: 'contact',
  quickNote: 'Quick Note',
  checkIn: 'check-in',
  treatment: 'treatment',
  medication: 'medication',
  impactArea: 'area of How it affects me',
};

function isItem(value: unknown): value is Item {
  const v = value as Partial<Item> | null;
  return (
    !!v &&
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    v.type in currentSchema &&
    typeof v.schema === 'number' &&
    typeof v.private === 'boolean' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string' &&
    typeof v.data === 'object' &&
    v.data !== null
  );
}

/** Whether an item can be restored as it is: the right shape, a version this app knows, valid contents. */
function readable(item: Item): boolean {
  try {
    const { item: current, readOnly } = upgrade(item);
    return !readOnly && validate(current.type, current.data as never, current.private).ok;
  } catch {
    return false;
  }
}

/** Opens a backup and checks everything in it, without changing anything on this device. */
export async function checkBackup(file: Blob, store: Store): Promise<CheckedBackup> {
  let entries: Record<string, Uint8Array>;
  let manifest: Manifest;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Anything that doesn't start like a zip is refused before unzipping:
    // the zip reader never finishes on a file shorter than a zip's ending.
    if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return { ok: false, reason: notABackup };
    entries = unzipSync(bytes);
    manifest = JSON.parse(strFromU8(entries['manifest.json'] ?? new Uint8Array())) as Manifest;
  } catch {
    return { ok: false, reason: notABackup };
  }
  if (manifest.app !== 'Say It Once' || !Array.isArray(manifest.records)) return { ok: false, reason: notABackup };
  if (manifest.format > backupFormat) {
    return { ok: false, reason: 'This backup was made by a newer version of Say It Once. Update the app, then try again. Nothing has been changed.' };
  }

  const records: CheckedRecord[] = [];
  for (const m of manifest.records) {
    let recordFile: RecordFile;
    try {
      recordFile = JSON.parse(strFromU8(entries[m.file] ?? new Uint8Array())) as RecordFile;
    } catch {
      return { ok: false, reason: notABackup };
    }
    if (!isItem(recordFile.record) || recordFile.record.type !== 'recordMeta' || !Array.isArray(recordFile.items)) {
      return { ok: false, reason: notABackup };
    }

    const problems: string[] = [];
    const files: RestoreRecord['files'] = [];
    for (const f of recordFile.files ?? []) {
      const bytes = entries[f.path];
      if (!bytes) {
        problems.push(`The file “${f.name}” is missing from the backup. Its entry will be restored without it.`);
        continue;
      }
      files.push({ fileId: f.fileId, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt, bytes: bytes.slice().buffer });
    }
    const present = new Set(files.map((f) => f.fileId));

    const items: Item[] = [];
    for (const raw of recordFile.items) {
      if (!isItem(raw) || !readable(raw)) {
        const kind = isItem(raw) ? (kindWords[raw.type] ?? 'entry') : 'entry';
        problems.push(`One ${kind} couldn’t be read, so it will be left out.`);
        continue;
      }
      items.push(withoutMissingFiles(raw, present));
    }

    records.push({
      restore: { meta: recordFile.record, items, files },
      name: recordFile.record.data.name,
      entries: items.length,
      files: files.length,
      problems,
      alreadyHere: await store.alreadyHere(recordFile.record.id),
    });
  }
  return { ok: true, createdAt: manifest.createdAt, personName: manifest.personName ?? '', records };
}

/** A document or Quick Note whose file isn't in the backup keeps everything else. */
function withoutMissingFiles(item: Item, present: Set<string>): Item {
  if (item.type === 'document') {
    const data = (item as Item<'document'>).data;
    if (data.file && !present.has(data.file.fileId)) return { ...item, data: { ...data, file: null } } as Item;
  }
  if (item.type === 'quickNote') {
    const data = (item as Item<'quickNote'>).data;
    if (data.photoFileId && !present.has(data.photoFileId)) return { ...item, data: { ...data, photoFileId: null } } as Item;
  }
  return item;
}
