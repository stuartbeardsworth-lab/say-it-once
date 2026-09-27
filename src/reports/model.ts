import { readableDate } from '../domain/format';
import { formatPence } from '../domain/money';
import { impactAreaLabel, impactAreas, sectionLabels } from '../domain/vocab';
import type {
  AppointmentData,
  CostData,
  DocumentData,
  ImpactAreaData,
  QuickNoteData,
  ShareableEntry,
  ShareableRecord,
} from '../shareable/types';
import { candidates, fixedSections, sectionTitle, type Selection } from './selection';
import type { Purpose, SectionKey } from './purposes';

// The document model (docs/architecture.md, "Document model"). A report is
// built once, as structured sections and blocks, from the shareable view and
// the person's selection. Every renderer (the reading view now; PDF and zip
// in Stage 5) draws this same model, so structure is never recovered from
// text and every output has exactly the same content.

export interface Field {
  label: string;
  value: string;
}

export type Block =
  | { type: 'subheading'; text: string }
  | { type: 'fields'; fields: Field[] }
  | { type: 'paragraph'; text: string }
  | { type: 'entry'; heading: string; fields: Field[]; paragraphs: string[]; refs: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'totals'; rows: Field[] };

export interface ReportSection {
  key: SectionKey;
  title: string;
  blocks: Block[];
}

export interface EvidenceItem {
  /** E1, E2 … in date order, the same in every output. */
  ref: string;
  documentId: string;
  title: string;
  date: string;
  from: string;
  fileId: string | null;
  fileName: string | null;
}

export interface PhotoItem {
  /** P1, P2 … in the order they appear in the report. */
  ref: string;
  noteId: string;
  fileId: string;
  /** The date of the Quick Note it was kept with. */
  date: string;
}

/** Evidence and photo references, handed to each section's builder. */
interface Refs {
  doc: (documentId: string | null) => string | null;
  photo: (noteId: string, fileId: string, createdAt: string) => string;
}

export interface Report {
  purposeKey: string;
  title: string;
  intro: string;
  kind: Purpose['kind'];
  recordName: string;
  personName: string;
  preparedOn: string;
  sections: ReportSection[];
  evidence: EvidenceItem[];
  /** Photos kept with the Quick Notes included, numbered in reading order. */
  photos: PhotoItem[];
  /** Kinds of personal information included (Q15), in plain words. */
  personalInfo: string[];
  signature: boolean;
  disclaimer: string;
  /**
   * The entries this report shows or mentions, so deleting one later can
   * say it was in a report already made. Never printed.
   */
  itemIds: string[];
}

type Section = ShareableEntry<unknown>;

const nonEmpty = (fields: Field[]) => fields.filter((f) => f.value.trim() !== '');

function selectedIds(selection: Selection, key: SectionKey): Set<string> {
  return new Set(selection[key]?.ids ?? []);
}

function pick<T extends Section>(list: T[], ids: Set<string>): T[] {
  return list.filter((e) => ids.has(e.id));
}

function byDate<T>(dateOf: (t: T) => string) {
  return (a: T, b: T) => dateOf(a).localeCompare(dateOf(b));
}

function noteBlocks(notes: ShareableEntry<QuickNoteData>[], refs: Refs): Block[] {
  if (notes.length === 0) return [];
  return [
    { type: 'subheading', text: 'Quick Notes' },
    ...notes
      .sort(byDate((n) => n.createdAt))
      .map((n): Block => {
        const photo = n.data.photoFileId ? refs.photo(n.id, n.data.photoFileId, n.createdAt) : null;
        return {
          type: 'entry',
          heading: readableDate(n.createdAt.slice(0, 10)),
          fields: photo ? [{ label: 'Photo', value: `See ${photo}` }] : [],
          paragraphs: n.data.text.trim() ? [n.data.text] : [],
          refs: photo ? [photo] : [],
        };
      }),
  ];
}

function filedNotes(view: ShareableRecord, ids: Set<string>, section: keyof typeof sectionLabels, refs: Refs): Block[] {
  return noteBlocks(view.quickNotes.filter((n) => n.data.filedTo?.section === section && ids.has(n.id)), refs);
}

function areaFields(a: ImpactAreaData): Field[] {
  return nonEmpty([
    { label: 'How it is', value: a.difficulty },
    { label: 'What happens', value: a.detail },
    { label: 'Help I need', value: a.help },
    { label: 'Aids or equipment', value: a.aid },
    { label: 'How often', value: a.often },
    { label: 'Doing it safely, and more than once', value: a.safety },
    { label: 'The time it takes', value: a.timeLonger },
    { label: 'Doing it properly, to a good standard', value: a.standard },
  ]);
}

function sortAreas<T extends { data: ImpactAreaData }>(list: T[]): T[] {
  return impactAreas.flatMap((def) => list.filter((a) => a.data.areaKey === def.key));
}

function appointmentHeading(a: AppointmentData) {
  return `${readableDate(a.date)}${a.time ? `, ${a.time}` : ''} — ${a.organisation}`;
}

function costFields(c: CostData): Field[] {
  return nonEmpty([
    { label: c.kind === 'income' ? 'From' : 'Date', value: readableDate(c.date) },
    { label: 'To', value: c.dateTo ? readableDate(c.dateTo) : '' },
    { label: 'Amount', value: c.amountPence !== null ? formatPence(c.amountPence) : '' },
    { label: 'Proof', value: c.evidence },
  ]);
}

function total(list: ShareableEntry<CostData>[], kind: CostData['kind']) {
  return list.filter((c) => c.data.kind === kind).reduce((sum, c) => sum + (c.data.amountPence ?? 0), 0);
}

function documentFields(d: DocumentData): Field[] {
  return nonEmpty([
    { label: 'Date', value: d.date ? readableDate(d.date) : '' },
    { label: 'From', value: d.from },
    { label: 'Relates to', value: d.relatedTo ? sectionLabels[d.relatedTo.section] : '' },
    { label: 'The important point', value: d.point },
    { label: 'Important wording', value: d.wording ? `“${d.wording}”` : '' },
    { label: 'Paper copy', value: d.paperCopy },
    { label: 'Reply or act by', value: d.actBy ? readableDate(d.actBy) : '' },
    { label: 'Done', value: d.done ? 'Yes' : '' },
    { label: 'File', value: d.file ? d.file.name : 'No digital copy kept' },
  ]);
}

/** E1, E2 … for the selected documents and letters linked from selected entries, in date order. */
function assignEvidence(view: ShareableRecord, selection: Selection): EvidenceItem[] {
  const wanted = new Set<string>();
  if (selection.documents?.included) for (const id of selection.documents.ids) wanted.add(id);
  if (selection.appointments?.included) {
    const ids = selectedIds(selection, 'appointments');
    for (const a of view.appointments) if (ids.has(a.id) && a.data.documentId) wanted.add(a.data.documentId);
  }
  if (selection.costs?.included) {
    const ids = selectedIds(selection, 'costs');
    for (const c of view.costs) if (ids.has(c.id) && c.data.documentId) wanted.add(c.data.documentId);
  }
  return view.documents
    .filter((d) => wanted.has(d.id))
    .sort((a, b) => (a.data.date || a.createdAt).localeCompare(b.data.date || b.createdAt) || a.data.title.localeCompare(b.data.title))
    .map((d, i) => ({
      ref: `E${i + 1}`,
      documentId: d.id,
      title: d.data.title || d.data.file?.name || 'Untitled document',
      date: d.data.date ? readableDate(d.data.date) : '',
      from: d.data.from,
      fileId: d.data.file?.fileId ?? null,
      fileName: d.data.file?.name ?? null,
    }));
}

/** What the "Where things are now" section mentions. */
function currentPositionParts(view: ShareableRecord, today: string) {
  const meds = view.medications.filter((m) => m.data.status !== 'Stopped');
  const treatments = [...view.treatments]
    .sort(byDate((t) => t.data.date || t.createdAt))
    .reverse()
    .slice(0, 3);
  const ordered = [...view.appointments].sort(byDate((a) => `${a.data.date}${a.data.time}`));
  const next = ordered.find((a) => a.data.date >= today);
  const last = ordered.filter((a) => a.data.date < today).at(-1);
  return { meds, treatments, last, next };
}

type Builder = (
  view: ShareableRecord,
  ids: Set<string>,
  refs: Refs,
  today: string,
) => Block[];

const builders: Record<SectionKey, Builder> = {
  account(view, ids, refs) {
    const i = view.incident;
    const blocks: Block[] = [];
    if (i) {
      const whenWhere = [i.date && readableDate(i.date), i.time, i.place].filter(Boolean).join(' · ');
      const fields = nonEmpty([
        { label: 'When and where', value: whenWhere },
        { label: 'Beforehand', value: i.before },
        { label: 'What happened', value: i.what },
        { label: 'What happened next', value: i.after },
        { label: 'Complications', value: i.complications },
        { label: 'What I was told at the time', value: i.told },
        { label: 'Other people there', value: i.witnesses },
        { label: 'Police, ambulance or fire service', value: i.services },
      ]);
      if (fields.length) blocks.push({ type: 'fields', fields });
    }
    return [...blocks, ...filedNotes(view, ids, 'what', refs)];
  },

  injuries(view) {
    return view.incident?.injuries.trim() ? [{ type: 'paragraph', text: view.incident.injuries }] : [];
  },

  work(view) {
    const w = view.workDetails;
    if (!w) return [];
    const date = (d: string) => (d ? readableDate(d) : '');
    return [
      {
        type: 'fields',
        fields: nonEmpty([
          { label: 'Employer', value: w.employer },
          { label: 'Workplace', value: w.workplace },
          { label: 'Job', value: w.jobTitle },
          { label: 'Started work there', value: date(w.employmentStart) },
          { label: 'Left', value: date(w.employmentEnd) },
          { label: 'Payroll or staff number', value: w.payrollRef },
          { label: 'Accident reported at work', value: w.accidentReported },
          { label: 'Reported to', value: w.reportedTo },
          { label: 'Date reported', value: date(w.reportDate) },
          { label: 'Back at work since', value: date(w.employmentSince) },
        ]),
      },
    ];
  },

  currentPosition(view, _ids, _refs, today) {
    const { meds, treatments, last, next } = currentPositionParts(view, today);
    const describe = (a: ShareableEntry<AppointmentData> | undefined) =>
      a ? `${readableDate(a.data.date)}, ${a.data.organisation}` : '';
    return [
      {
        type: 'fields',
        fields: nonEmpty([
          { label: 'Areas of daily life affected', value: sortAreas(view.impactAreas).map((a) => impactAreaLabel(a.data.areaKey)).join(', ') },
          { label: 'Medication', value: meds.map((m) => m.data.name).join(', ') },
          { label: 'Recent treatment', value: treatments.map((t) => t.data.name).join(', ') },
          { label: 'Last appointment', value: describe(last) },
          { label: 'Next appointment', value: describe(next) },
        ]),
      },
    ];
  },

  impact(view, ids, refs) {
    const blocks: Block[] = sortAreas(pick(view.impactAreas, ids)).map((a) => ({
      type: 'entry',
      heading: impactAreaLabel(a.data.areaKey),
      fields: areaFields(a.data),
      paragraphs: [],
      refs: [],
    }));
    if (view.impactNote && ids.has(view.impactNote.id) && view.impactNote.data.text.trim()) {
      blocks.push({ type: 'entry', heading: 'Anything else this has changed', fields: [], paragraphs: [view.impactNote.data.text], refs: [] });
    }
    return [...blocks, ...filedNotes(view, ids, 'impact', refs)];
  },

  changes(view, ids) {
    const blocks: Block[] = [];
    const checks = pick(view.checkIns, ids).sort(byDate((c) => c.data.date));
    if (checks.length) {
      blocks.push({ type: 'subheading', text: 'Health and wellbeing check-ins' });
      for (const c of checks) {
        blocks.push({
          type: 'entry',
          heading: readableDate(c.data.date),
          fields: nonEmpty([
            { label: 'Pain', value: c.data.pain },
            { label: 'How I felt', value: c.data.feeling },
            { label: 'Pulse', value: c.data.pulse !== null ? `${c.data.pulse} beats per minute` : '' },
          ]),
          paragraphs: c.data.note.trim() ? [c.data.note] : [],
          refs: [],
        });
      }
    }
    const snaps = pick(view.snapshots, ids).sort(byDate((s) => s.createdAt));
    if (snaps.length) {
      blocks.push({ type: 'subheading', text: 'Earlier positions' });
      for (const s of snaps) {
        blocks.push({
          type: 'entry',
          heading: `How things were from ${readableDate(s.data.date)}`,
          fields: sortAreas(s.data.areas).flatMap((a) =>
            areaFields(a.data).map((f) => ({ label: `${impactAreaLabel(a.data.areaKey)}: ${f.label}`, value: f.value })),
          ),
          paragraphs: s.data.note ? [s.data.note.text] : [],
          refs: [],
        });
      }
    }
    return blocks;
  },

  treatment(view, ids, refs) {
    const blocks: Block[] = [];
    const i = view.incident;
    const fixed = nonEmpty([
      { label: 'Straight afterwards', value: i?.treatment ?? '' },
      { label: 'Ongoing care', value: i?.ongoingCare ?? '' },
    ]);
    if (fixed.length) blocks.push({ type: 'fields', fields: fixed });
    const treatments = pick(view.treatments, ids).sort(byDate((t) => t.data.date || t.createdAt));
    if (treatments.length) {
      blocks.push({ type: 'subheading', text: 'Treatment' });
      for (const t of treatments) {
        blocks.push({
          type: 'entry',
          heading: t.data.name,
          fields: nonEmpty([
            { label: 'Date', value: t.data.date ? readableDate(t.data.date) : '' },
            { label: 'Did it help?', value: t.data.effect },
          ]),
          paragraphs: t.data.note.trim() ? [t.data.note] : [],
          refs: [],
        });
      }
    }
    const meds = pick(view.medications, ids);
    if (meds.length) {
      blocks.push({ type: 'subheading', text: 'Medication' });
      for (const m of meds) {
        blocks.push({
          type: 'entry',
          heading: m.data.name,
          fields: nonEmpty([
            { label: 'For', value: m.data.forWhat },
            { label: 'Dose', value: m.data.dose },
            { label: 'How often', value: m.data.often },
            { label: 'Still taking?', value: m.data.status },
            { label: 'Started', value: m.data.started ? readableDate(m.data.started) : '' },
            { label: 'Has it helped?', value: m.data.effect },
            { label: 'Side effects', value: m.data.sideEffects },
          ]),
          paragraphs: [],
          refs: [],
        });
      }
    }
    return [...blocks, ...filedNotes(view, ids, 'treatment', refs)];
  },

  appointments(view, ids, refs) {
    const appts = pick(view.appointments, ids).sort(byDate((a) => `${a.data.date}${a.data.time}`));
    const blocks: Block[] = appts.map((a) => {
      const ref = refs.doc(a.data.documentId);
      return {
        type: 'entry',
        heading: appointmentHeading(a.data),
        fields: nonEmpty([
          { label: 'Type', value: a.data.type },
          { label: 'Seeing', value: a.data.person },
          { label: 'What it was for', value: a.data.purpose },
          { label: 'Where', value: a.data.location },
          { label: 'What I was told', value: a.data.told },
          { label: 'What happens next', value: a.data.next },
          { label: 'Letter', value: ref ? `See ${ref}` : '' },
        ]),
        paragraphs: [],
        refs: ref ? [ref] : [],
      };
    });
    return [...blocks, ...filedNotes(view, ids, 'appointments', refs)];
  },

  costSummary(view) {
    const spent = total(view.costs, 'expense');
    const lost = total(view.costs, 'income');
    return [
      {
        type: 'totals',
        rows: [
          { label: 'Entries', value: String(view.costs.length) },
          { label: 'Money spent', value: formatPence(spent) },
          { label: 'Income lost', value: formatPence(lost) },
          { label: 'Together', value: formatPence(spent + lost) },
        ],
      },
    ];
  },

  costs(view, ids, refs) {
    const chosen = pick(view.costs, ids).sort(byDate((c) => c.data.date));
    const blocks: Block[] = [];
    for (const [kind, heading] of [
      ['expense', 'Money I spent'],
      ['income', 'Income I lost'],
    ] as const) {
      const list = chosen.filter((c) => c.data.kind === kind);
      if (!list.length) continue;
      blocks.push({ type: 'subheading', text: heading });
      for (const c of list) {
        const ref = refs.doc(c.data.documentId);
        blocks.push({
          type: 'entry',
          heading: c.data.item,
          fields: [...costFields(c.data), ...(ref ? [{ label: 'Document', value: `See ${ref}` }] : [])],
          paragraphs: [],
          refs: ref ? [ref] : [],
        });
      }
    }
    if (chosen.length) {
      const spent = total(chosen, 'expense');
      const lost = total(chosen, 'income');
      blocks.push({
        type: 'totals',
        rows: [
          { label: 'Money spent', value: formatPence(spent) },
          { label: 'Income lost', value: formatPence(lost) },
          { label: 'Together', value: formatPence(spent + lost) },
        ],
      });
    }
    return [...blocks, ...filedNotes(view, ids, 'costs', refs)];
  },

  contacts(view, ids, refs) {
    const blocks: Block[] = pick(view.contacts, ids).map((c) => ({
      type: 'entry',
      heading: c.data.organisation || c.data.phoneOrEmail,
      fields: nonEmpty([
        { label: 'Role', value: c.data.role },
        { label: 'Reference', value: c.data.reference },
        { label: 'Phone or email', value: c.data.phoneOrEmail },
      ]),
      paragraphs: [],
      refs: [],
    }));
    return [...blocks, ...filedNotes(view, ids, 'contacts', refs)];
  },

  documents(view, ids, refs) {
    const docs = pick(view.documents, ids).sort(
      byDate((d) => d.data.date || d.createdAt),
    );
    const blocks: Block[] = docs.map((d) => {
      const ref = refs.doc(d.id);
      return {
        type: 'entry',
        heading: `${ref ? `${ref}: ` : ''}${d.data.title || d.data.file?.name || 'Untitled document'}`,
        fields: documentFields(d.data),
        paragraphs: [],
        refs: ref ? [ref] : [],
      };
    });
    return [...blocks, ...filedNotes(view, ids, 'documents', refs)];
  },

  quickNotes(view, ids, refs) {
    const notes = view.quickNotes.filter((n) => n.data.filedTo === null && ids.has(n.id));
    return noteBlocks(notes, refs).slice(1);
  },

  chronology(view, ids) {
    const rows: { date: string; text: string }[] = [];
    if (view.incident?.date) rows.push({ date: view.incident.date, text: `What happened${view.incident.place ? `, ${view.incident.place}` : ''}` });
    for (const c of candidates(view, 'chronology')) {
      if (ids.has(c.id)) rows.push({ date: c.sortKey.slice(0, 10), text: c.label });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.length ? [{ type: 'list', items: rows.map((r) => `${readableDate(r.date)} — ${r.text}`) }] : [];
  },
};

function personalInfo(view: ShareableRecord, selection: Selection, sections: ReportSection[]): string[] {
  const included = new Set(sections.map((s) => s.key));
  const impactIds = selectedIds(selection, 'impact');
  const found: string[] = [];
  const areaIncluded = (key: string) =>
    included.has('impact') && view.impactAreas.some((a) => a.data.areaKey === key && impactIds.has(a.id));
  if (areaIncluded('toilet')) found.push('How you manage using the toilet');
  if (areaIncluded('people')) found.push('How you get on mixing with other people');
  const changeIds = selectedIds(selection, 'changes');
  if (included.has('changes') && view.checkIns.some((c) => changeIds.has(c.id))) {
    found.push('Your pain and how you have been feeling');
  }
  if (included.has('costs') || included.has('costSummary')) found.push('Money you have spent and income you have lost');
  return found;
}

export interface BuildOptions {
  /** Today's date on this device, YYYY-MM-DD. */
  today: string;
}

export function buildReport(view: ShareableRecord, purpose: Purpose, selection: Selection, options: BuildOptions): Report {
  const evidence = assignEvidence(view, selection);
  const docRefs = new Map(evidence.map((e) => [e.documentId, e.ref]));
  const photos: PhotoItem[] = [];
  const refs: Refs = {
    doc: (documentId) => (documentId ? (docRefs.get(documentId) ?? null) : null),
    photo: (noteId, fileId, createdAt) => {
      const known = photos.find((p) => p.noteId === noteId);
      if (known) return known.ref;
      const ref = `P${photos.length + 1}`;
      photos.push({ ref, noteId, fileId, date: readableDate(createdAt.slice(0, 10)) });
      return ref;
    },
  };

  const sections: ReportSection[] = [];
  for (const config of purpose.sections) {
    const chosen = selection[config.key];
    if (!chosen?.included) continue;
    const ids = fixedSections.has(config.key) ? new Set(candidates(view, config.key).map((c) => c.id)) : new Set(chosen.ids);
    const blocks = builders[config.key](view, ids, refs, options.today);
    if (blocks.length) sections.push({ key: config.key, title: sectionTitle(purpose, config.key), blocks });
  }

  const itemIds = new Set(evidence.map((e) => e.documentId));
  for (const s of sections) {
    // What happened and work details are one per record and are never deleted
    // on their own, so only entries that can be deleted are noted.
    if (s.key === 'currentPosition') {
      const parts = currentPositionParts(view, options.today);
      for (const e of [...view.impactAreas, ...parts.meds, ...parts.treatments, parts.last, parts.next]) if (e) itemIds.add(e.id);
    }
    if (!fixedSections.has(s.key)) for (const id of selection[s.key]?.ids ?? []) itemIds.add(id);
  }

  const person = view.personName.trim();
  return {
    purposeKey: purpose.key,
    title: purpose.title,
    intro: purpose.intro,
    kind: purpose.kind,
    recordName: view.recordName,
    personName: person,
    preparedOn: readableDate(options.today),
    sections,
    evidence,
    photos,
    personalInfo: personalInfo(view, selection, sections),
    signature: purpose.signature,
    itemIds: [...itemIds],
    disclaimer: `This was written by ${person || 'the person it is about'}, in their own words, using Say It Once. It is their own record and not a formal witness statement or medical report.`,
  };
}

/**
 * The small line at the foot of every report page (and of the HTML copy),
 * so whoever receives a report can see where it came from. No arrows: the
 * PDF font has no arrow character.
 */
export const madeWith = 'Made with Say It Once · Record it, keep it together, use it when you need it';

/** Every piece of text in a report, in reading order. Used to prove renderers match. */
export function reportText(report: Report): string[] {
  const out = [report.title, report.intro, report.personName, report.recordName, report.preparedOn];
  for (const s of report.sections) {
    out.push(s.title);
    for (const b of s.blocks) {
      if (b.type === 'subheading' || b.type === 'paragraph') out.push(b.text);
      else if (b.type === 'fields' || b.type === 'totals') for (const f of b.type === 'fields' ? b.fields : b.rows) out.push(f.label, f.value);
      else if (b.type === 'entry') out.push(b.heading, ...b.fields.flatMap((f) => [f.label, f.value]), ...b.paragraphs);
      else out.push(...b.items);
    }
  }
  for (const e of report.evidence) out.push(e.ref, e.title, e.date, e.from, e.fileName ?? '');
  for (const p of report.photos) out.push(p.ref, p.date);
  // The personal-information warning is shown in the app before sharing,
  // not printed in the report, so it isn't part of the report's text.
  out.push(report.disclaimer);
  return out.filter((t) => t !== '');
}
