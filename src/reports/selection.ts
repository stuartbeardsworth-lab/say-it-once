import { readableDate } from '../domain/format';
import { impactAreaLabel } from '../domain/vocab';
import type { ShareableEntry, ShareableRecord } from '../shareable/types';
import { sectionTitles, type DefaultRule, type Purpose, type SectionKey } from './purposes';

// What goes into a report (decision Q4): deterministic defaults the person
// can see and change. Everything here is chosen from the shareable view, so
// a private entry can never be offered, pre-ticked or added (fixes D2).

export interface Candidate {
  id: string;
  /** What the person sees when choosing entries. */
  label: string;
  /** For ordering: YYYY-MM-DD, or a timestamp. */
  sortKey: string;
  /** Filed Quick Notes are always included with their section (fixes D7). */
  isNote: boolean;
}

export interface SectionSelection {
  included: boolean;
  /** The chosen entries, for sections that have entries to choose. */
  ids: string[];
}

export type Selection = Partial<Record<SectionKey, SectionSelection>>;

/** Sections whose content is fixed or worked out, with no entries to choose. */
export const fixedSections: ReadonlySet<SectionKey> = new Set(['account', 'injuries', 'work', 'currentPosition', 'costSummary']);

const filedIn = (view: ShareableRecord, section: string) => view.quickNotes.filter((n) => n.data.filedTo?.section === section);

function noteCandidate(n: ShareableEntry<{ text: string }>): Candidate {
  const text = n.data.text.trim();
  return {
    id: n.id,
    label: `Quick Note: ${text ? text.slice(0, 60) : 'photo'}${text.length > 60 ? '…' : ''}`,
    sortKey: n.createdAt,
    isNote: true,
  };
}

function when(date: string, fallback: string) {
  return date || fallback;
}

/** Everything that could go into a section, from the shareable view only. */
export function candidates(view: ShareableRecord, section: SectionKey): Candidate[] {
  const notes = (s: string) => filedIn(view, s).map(noteCandidate);
  switch (section) {
    case 'account':
      return notes('what');
    case 'impact':
      return [
        ...view.impactAreas.map((a) => ({ id: a.id, label: impactAreaLabel(a.data.areaKey), sortKey: a.updatedAt, isNote: false })),
        ...(view.impactNote && view.impactNote.data.text.trim()
          ? [{ id: view.impactNote.id, label: 'Anything else this has changed', sortKey: view.impactNote.updatedAt, isNote: false }]
          : []),
        ...notes('impact'),
      ];
    case 'changes':
      return [
        ...view.checkIns.map((c) => ({ id: c.id, label: `Check-in, ${readableDate(c.data.date)}`, sortKey: c.data.date, isNote: false })),
        ...view.snapshots.map((s) => ({ id: s.id, label: `Earlier position from ${readableDate(s.data.date)}`, sortKey: s.createdAt, isNote: false })),
      ];
    case 'treatment':
      return [
        ...view.treatments.map((t) => ({ id: t.id, label: `Treatment: ${t.data.name}`, sortKey: when(t.data.date, t.createdAt), isNote: false })),
        ...view.medications.map((m) => ({ id: m.id, label: `Medication: ${m.data.name}`, sortKey: when(m.data.started, m.createdAt), isNote: false })),
        ...notes('treatment'),
      ];
    case 'appointments':
      return [
        ...view.appointments.map((a) => ({
          id: a.id,
          label: `${readableDate(a.data.date)}, ${a.data.organisation}`,
          sortKey: `${a.data.date}${a.data.time}`,
          isNote: false,
        })),
        ...notes('appointments'),
      ];
    case 'costs':
      return [
        ...view.costs.map((c) => ({ id: c.id, label: `${c.data.item}, ${readableDate(c.data.date)}`, sortKey: c.data.date, isNote: false })),
        ...notes('costs'),
      ];
    case 'contacts':
      return [
        ...view.contacts.map((c) => ({ id: c.id, label: c.data.organisation || c.data.phoneOrEmail, sortKey: c.createdAt, isNote: false })),
        ...notes('contacts'),
      ];
    case 'documents':
      return [
        ...view.documents.map((d) => ({
          id: d.id,
          label: d.data.title || d.data.file?.name || 'Untitled document',
          sortKey: when(d.data.date, d.createdAt),
          isNote: false,
        })),
        ...notes('documents'),
      ];
    case 'quickNotes':
      return view.quickNotes.filter((n) => n.data.filedTo === null).map(noteCandidate);
    case 'chronology':
      return chronologyCandidates(view);
    default:
      return [];
  }
}

function chronologyCandidates(view: ShareableRecord): Candidate[] {
  const letters = new Set(view.appointments.map((a) => a.data.documentId).filter((id): id is string => id !== null));
  const c = (id: string, label: string, sortKey: string): Candidate => ({ id, label, sortKey, isNote: false });
  return [
    ...view.appointments.map((a) => c(a.id, `Appointment: ${a.data.organisation}`, a.data.date)),
    ...view.treatments.filter((t) => t.data.date).map((t) => c(t.id, `Treatment: ${t.data.name}`, t.data.date)),
    ...view.medications.filter((m) => m.data.started).map((m) => c(m.id, `Started ${m.data.name}`, m.data.started)),
    ...view.documents.filter((d) => d.data.date && !letters.has(d.id)).map((d) => c(d.id, `Document: ${d.data.title}`, d.data.date)),
    ...view.costs.map((x) => c(x.id, `${x.data.kind === 'income' ? 'Income lost' : 'Spent'}: ${x.data.item}`, x.data.date)),
    ...view.checkIns.map((x) => c(x.id, 'Check-in', x.data.date)),
    ...view.snapshots.map((s) => c(s.id, 'Earlier position saved', s.createdAt.slice(0, 10))),
  ];
}

/** Whether a section has anything to show. Empty sections are left out. */
export function hasContent(view: ShareableRecord, section: SectionKey): boolean {
  const i = view.incident;
  switch (section) {
    case 'account':
      return Boolean(i && [i.date, i.place, i.before, i.what, i.after, i.told, i.witnesses, i.services, i.complications].some((v) => v.trim())) ||
        candidates(view, 'account').length > 0;
    case 'injuries':
      return Boolean(i?.injuries.trim());
    case 'work':
      return Boolean(view.workDetails && Object.values(view.workDetails).some((v) => typeof v === 'string' && v.trim()));
    case 'currentPosition':
      return view.impactAreas.length > 0 || view.medications.length > 0 || view.treatments.length > 0 || view.appointments.length > 0;
    case 'costSummary':
      return view.costs.length > 0;
    case 'treatment':
      return Boolean(i?.treatment.trim() || i?.ongoingCare.trim()) || candidates(view, 'treatment').length > 0;
    default:
      return candidates(view, section).length > 0;
  }
}

function applyRule(list: Candidate[], rule: DefaultRule, today: string): string[] {
  const entries = list.filter((c) => !c.isNote);
  const notes = list.filter((c) => c.isNote).map((c) => c.id);
  const newestFirst = [...entries].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  let chosen: Candidate[];
  if (rule.pick === 'all') chosen = newestFirst;
  else if (rule.pick === 'newest') chosen = newestFirst.slice(0, rule.limit);
  else {
    const upcoming = entries.filter((c) => c.sortKey.slice(0, 10) >= today).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const past = newestFirst.filter((c) => c.sortKey.slice(0, 10) < today);
    chosen = [...upcoming.slice(0, rule.next), ...past.slice(0, rule.recent)];
  }
  return [...chosen.map((c) => c.id), ...notes];
}

/** Words describing a default, shown to the person, e.g. "Newest 6". */
export function describeRule(rule: DefaultRule | undefined): string {
  if (!rule || rule.pick === 'all') return 'Everything';
  if (rule.pick === 'newest') return `The newest ${rule.limit}`;
  return `The next ${rule.next} and the last ${rule.recent}`;
}

export function defaultSelection(purpose: Purpose, view: ShareableRecord, today: string): Selection {
  const selection: Selection = {};
  for (const s of purpose.sections) {
    const included = hasContent(view, s.key);
    selection[s.key] = {
      included,
      ids: fixedSections.has(s.key) ? [] : applyRule(candidates(view, s.key), s.rule ?? { pick: 'all' }, today),
    };
  }
  return selection;
}

/** Every section of the purpose with every entry. Used by the full record and by tests. */
export function selectEverything(purpose: Purpose, view: ShareableRecord): Selection {
  const selection: Selection = {};
  for (const s of purpose.sections) {
    selection[s.key] = { included: hasContent(view, s.key), ids: candidates(view, s.key).map((c) => c.id) };
  }
  return selection;
}

export function sectionTitle(purpose: Purpose, key: SectionKey): string {
  return purpose.sections.find((s) => s.key === key)?.title ?? sectionTitles[key];
}

/**
 * A selection made from chosen entries, such as Find's "Use these results".
 * Only entries the shareable view offers can be chosen, so an ID of a
 * private entry is simply ignored. Sections with none of the entries are
 * left out; fixed sections (worked out from the record) are left out too.
 */
export function selectionFromIds(purpose: Purpose, view: ShareableRecord, ids: readonly string[]): Selection {
  const wanted = new Set(ids);
  const selection: Selection = {};
  for (const s of purpose.sections) {
    const chosen = fixedSections.has(s.key) ? [] : candidates(view, s.key).map((c) => c.id).filter((id) => wanted.has(id));
    selection[s.key] = { included: chosen.length > 0, ids: chosen };
  }
  return selection;
}

/** How many of the given IDs could go in a report at all (the rest are private or missing). */
export function countShareable(view: ShareableRecord, ids: readonly string[]): number {
  const all = new Set<string>();
  for (const key of Object.keys(sectionTitles) as SectionKey[]) for (const c of candidates(view, key)) all.add(c.id);
  return ids.filter((id) => all.has(id)).length;
}
