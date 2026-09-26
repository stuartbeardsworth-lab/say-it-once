import type { AnyItem, Item, ItemType } from '../domain/types';
import type { ExcludedSummary, ShareableEntry, ShareableRecord } from './types';

// toShareable (docs/architecture.md, "Privacy filter"): the one function
// through which record data reaches any output. It runs before selection,
// before the chronology and before any file is read.
//
// It removes:
// 1. every item marked private, of every type;
// 2. every trace of a removed item: links to it from appointments, costs
//    and documents, and its copies inside impact snapshots, judged by the
//    item's private flag as it is NOW, not when the snapshot was taken
//    (fixes D3);
// 3. private Quick Notes wherever they are filed, and their photos.
// Anything a trace points at that no longer exists is treated the same way.

function entry<D>(item: { id: string; data: D; createdAt: string; updatedAt: string }): ShareableEntry<D> {
  // Copy the data so nothing downstream can reach the stored object.
  return { id: item.id, data: structuredClone(item.data), createdAt: item.createdAt, updatedAt: item.updatedAt };
}

function ofType<T extends ItemType>(items: readonly AnyItem[], type: T): Item<T>[] {
  return items.filter((i) => i.type === type) as unknown as Item<T>[];
}

export interface ShareableResult {
  view: ShareableRecord;
  excluded: ExcludedSummary;
}

export function toShareable(recordId: string, items: readonly AnyItem[], personName = ''): ShareableResult {
  const inRecord = items.filter((i) => i.recordId === recordId);
  const meta = ofType(inRecord, 'recordMeta')[0];

  // IDs that may appear anywhere in an output.
  const shareable = new Set(inRecord.filter((i) => !i.private).map((i) => i.id));
  const excluded: ExcludedSummary = { total: 0, byKind: {} };
  for (const i of inRecord) {
    if (i.private) {
      excluded.total += 1;
      excluded.byKind[i.type] = (excluded.byKind[i.type] ?? 0) + 1;
    }
  }

  const keep = <T extends ItemType>(type: T) => ofType(inRecord, type).filter((i) => shareable.has(i.id));
  const linkOrNull = (id: string | null) => (id && shareable.has(id) ? id : null);

  const appointments = keep('appointment').map((a) => {
    const e = entry(a);
    e.data.documentId = linkOrNull(e.data.documentId);
    return e;
  });

  const costs = keep('cost').map((c) => {
    const e = entry(c);
    e.data.documentId = linkOrNull(e.data.documentId);
    return e;
  });

  const documents = keep('document').map((d) => {
    const e = entry(d);
    if (e.data.relatedTo?.itemId && !shareable.has(e.data.relatedTo.itemId)) {
      e.data.relatedTo = { section: e.data.relatedTo.section, itemId: null };
    }
    return e;
  });

  const snapshots = ofType(inRecord, 'impactSnapshot').flatMap((s) => {
    const e = entry(s);
    e.data.areas = e.data.areas.filter((a) => shareable.has(a.itemId));
    if (e.data.note && !shareable.has(e.data.note.itemId)) e.data.note = null;
    return e.data.areas.length > 0 || e.data.note ? [e] : [];
  });

  const quickNotes = keep('quickNote').map(entry);
  const incident = ofType(inRecord, 'incident')[0];
  const workDetails = ofType(inRecord, 'workDetails')[0];
  const impactNote = keep('impactNote')[0];

  const view: ShareableRecord = {
    kind: 'shareable',
    recordId,
    recordName: meta?.data.name ?? '',
    personName,
    impactCurrentSince: meta?.data.impactCurrentSince ?? '',
    incident: incident ? structuredClone(incident.data) : null,
    workDetails: workDetails ? structuredClone(workDetails.data) : null,
    impactAreas: keep('impactArea').map(entry),
    impactNote: impactNote ? entry(impactNote) : null,
    snapshots,
    checkIns: keep('checkIn').map(entry),
    appointments,
    treatments: keep('treatment').map(entry),
    medications: keep('medication').map(entry),
    costs,
    documents,
    contacts: keep('contact').map(entry),
    quickNotes,
  };
  return { view, excluded };
}

/**
 * The only files an output may contain: those belonging to entries in the
 * shareable view. Report code reads files through this list and nothing else.
 */
export function shareableFiles(view: ShareableRecord): { fileId: string; name: string; type: string; ownerId: string }[] {
  const files: { fileId: string; name: string; type: string; ownerId: string }[] = [];
  for (const d of view.documents) {
    if (d.data.file) files.push({ fileId: d.data.file.fileId, name: d.data.file.name, type: d.data.file.type, ownerId: d.id });
  }
  for (const n of view.quickNotes) {
    if (n.data.photoFileId) files.push({ fileId: n.data.photoFileId, name: 'photo', type: 'image/*', ownerId: n.id });
  }
  return files;
}
