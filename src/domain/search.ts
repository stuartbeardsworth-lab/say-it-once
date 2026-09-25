import { today } from './dates';
import type { AnyItem, Item, ItemType } from './types';
import { impactAreaLabel } from './vocab';

// Find in my record: plain text search over structured entries, plus a few
// fixed answers worked out from the data itself. Nothing here guesses at
// what a question means, and nothing interprets health.

export type SearchableType = Exclude<ItemType, 'profile' | 'recordMeta' | 'impactSnapshot'>;
export type SearchableItem = Extract<AnyItem, { type: SearchableType }>;

export const kindLabels: Record<SearchableType, string> = {
  incident: 'What happened',
  impactArea: 'How it affects me',
  impactNote: 'How it affects me',
  checkIn: 'Check-in',
  appointment: 'Appointment',
  treatment: 'Treatment',
  medication: 'Medication',
  cost: 'Cost or lost income',
  document: 'Letter or document',
  contact: 'Contact',
  quickNote: 'Quick Note',
  workDetails: 'Work details',
};

/** The filters offered on Find, each covering one or more kinds. */
export const filters = [
  { key: 'all', label: 'Everything', types: null },
  { key: 'appointments', label: 'Appointments', types: ['appointment'] },
  { key: 'treatment', label: 'Treatment & medication', types: ['treatment', 'medication'] },
  { key: 'documents', label: 'Letters & documents', types: ['document'] },
  { key: 'costs', label: 'Costs', types: ['cost'] },
  { key: 'notes', label: 'Quick Notes', types: ['quickNote'] },
  { key: 'impact', label: 'How it affects me', types: ['impactArea', 'impactNote', 'checkIn'] },
] as const satisfies readonly { key: string; label: string; types: readonly SearchableType[] | null }[];

export type FilterKey = (typeof filters)[number]['key'];

export function isSearchable(item: AnyItem): item is SearchableItem {
  return item.type !== 'profile' && item.type !== 'recordMeta' && item.type !== 'impactSnapshot';
}

/** A short name for an entry, as a person would recognise it. */
export function titleOf(item: SearchableItem): string {
  const i = item;
  switch (i.type) {
    case 'incident':
      return 'What happened';
    case 'impactArea':
      return impactAreaLabel(i.data.areaKey);
    case 'impactNote':
      return 'Anything else this has changed';
    case 'checkIn':
      return `Check-in, ${i.data.date}`;
    case 'appointment':
      return `${i.data.organisation}, ${i.data.date}`;
    case 'treatment':
      return i.data.name;
    case 'medication':
      return i.data.name;
    case 'cost':
      return i.data.item;
    case 'document':
      return i.data.title || i.data.file?.name || 'Untitled document';
    case 'contact':
      return i.data.organisation || i.data.phoneOrEmail;
    case 'quickNote':
      return i.data.text.split('\n')[0]?.slice(0, 60) || 'Photo';
    case 'workDetails':
      return 'Work details';
    default:
      return '';
  }
}

/** Every piece of text in an entry that a search should look at. */
function textsOf(item: SearchableItem): string[] {
  const values = Object.values(item.data as unknown as Record<string, unknown>).flatMap((v) => {
    if (typeof v === 'string') return [v];
    if (v && typeof v === 'object' && 'name' in v && typeof v.name === 'string') return [v.name];
    return [];
  });
  return [titleOf(item), ...values].filter((t) => t.trim() !== '');
}

export interface SearchResult {
  item: SearchableItem;
  title: string;
  kind: string;
  /** The words around the first match. */
  snippet: string;
}

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
}

/**
 * Entries containing every word of the query, in any field, ignoring case.
 * Newest first.
 */
export function search(items: readonly AnyItem[], query: string, filter: FilterKey = 'all'): SearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const allowed = filters.find((f) => f.key === filter)?.types ?? null;
  const results: SearchResult[] = [];
  for (const item of items) {
    if (!isSearchable(item)) continue;
    if (allowed && !(allowed as readonly string[]).includes(item.type)) continue;
    const texts = textsOf(item);
    const joined = texts.join('\n').toLowerCase();
    if (!words.every((w) => joined.includes(w))) continue;
    const first = words[0] ?? '';
    const where = texts.find((t) => t.toLowerCase().includes(first)) ?? texts[0] ?? '';
    results.push({
      item,
      title: titleOf(item),
      kind: kindLabels[item.type],
      snippet: snippetAround(where, where.toLowerCase().indexOf(first), first.length),
    });
  }
  return results.sort((a, b) => b.item.updatedAt.localeCompare(a.item.updatedAt));
}

export interface QuickAnswers {
  spentPence: number;
  lostPence: number;
  currentMedication: Item<'medication'>[];
  nextAppointment: Item<'appointment'> | undefined;
}

/** Answers that come straight from the entries, with no guessing. */
export function quickAnswers(items: readonly AnyItem[], now = today()): QuickAnswers {
  let spentPence = 0;
  let lostPence = 0;
  const currentMedication: Item<'medication'>[] = [];
  const upcoming: Item<'appointment'>[] = [];
  for (const i of items) {
    if (i.type === 'cost') {
      if (i.data.kind === 'expense') spentPence += i.data.amountPence ?? 0;
      else lostPence += i.data.amountPence ?? 0;
    } else if (i.type === 'medication') {
      // Everything not marked as stopped: the person may not have filled in a status.
      if (i.data.status !== 'Stopped') currentMedication.push(i);
    } else if (i.type === 'appointment' && i.data.date >= now) {
      upcoming.push(i);
    }
  }
  upcoming.sort((a, b) => `${a.data.date}${a.data.time}`.localeCompare(`${b.data.date}${b.data.time}`));
  return { spentPence, lostPence, currentMedication, nextAppointment: upcoming[0] };
}

/** The screen where an entry lives. */
export const screenFor: Record<SearchableType, 'what' | 'impact' | 'appointments' | 'treatment' | 'costs' | 'documents' | 'contacts' | 'quick-notes' | 'records'> = {
  incident: 'what',
  impactArea: 'impact',
  impactNote: 'impact',
  checkIn: 'impact',
  appointment: 'appointments',
  treatment: 'treatment',
  medication: 'treatment',
  cost: 'costs',
  document: 'documents',
  contact: 'contacts',
  quickNote: 'quick-notes',
  workDetails: 'records',
};
