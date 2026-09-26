import fc from 'fast-check';
import { strFromU8, unzipSync } from 'fflate';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { blank } from '../domain/blank';
import type { AnyItem, ItemDataMap, ItemType } from '../domain/types';
import { impactAreas, sections } from '../domain/vocab';
import { buildReport, reportText } from '../reports/model';
import { pdfText, reportToPdf } from '../reports/pdf';
import { purposes } from '../reports/purposes';
import { ReadingView } from '../reports/ReadingView';
import { defaultSelection, selectEverything } from '../reports/selection';
import { makeZip } from '../reports/zip';
import { shareableFiles, toShareable } from './toShareable';

// The privacy property test (docs/architecture.md, "Tests that prove it").
// Thousands of random records, covering every item type, links, snapshots,
// filed Quick Notes with photos, and files. Every piece of free text holds a
// unique marker word; every file has a unique ID. Private flags are random.
//
// For every purpose, with the default selection and with everything
// selected, no marker from a private item appears in any output: the
// report model, the reading view's HTML, the PDF's content, the list of
// files, or the zip (its file names, its HTML page and its attachments). And with
// everything selected in the full record, every marker from a non-private
// item does appear, so over-filtering fails too.

const RECORD = 'rec';

/** The shape of a random record; markers and IDs are filled in by build(). */
const planArb = fc.record({
  incident: fc.boolean(),
  work: fc.boolean(),
  areas: fc.uniqueArray(fc.record({ key: fc.integer({ min: 0, max: 11 }), private: fc.boolean() }), {
    selector: (a) => a.key,
    maxLength: 5,
  }),
  note: fc.option(fc.boolean(), { nil: null }),
  snapshots: fc.array(fc.record({ areas: fc.array(fc.nat(), { maxLength: 4 }), withNote: fc.boolean() }), { maxLength: 3 }),
  checkIns: fc.array(fc.boolean(), { maxLength: 3 }),
  appointments: fc.array(fc.record({ private: fc.boolean(), doc: fc.option(fc.nat(), { nil: null }), past: fc.boolean() }), { maxLength: 4 }),
  treatments: fc.array(fc.boolean(), { maxLength: 3 }),
  medications: fc.array(fc.record({ private: fc.boolean(), stopped: fc.boolean() }), { maxLength: 3 }),
  costs: fc.array(fc.record({ private: fc.boolean(), income: fc.boolean(), doc: fc.option(fc.nat(), { nil: null }) }), { maxLength: 4 }),
  documents: fc.array(fc.record({ private: fc.boolean(), file: fc.boolean(), related: fc.option(fc.nat(), { nil: null }) }), { maxLength: 4 }),
  contacts: fc.array(fc.boolean(), { maxLength: 3 }),
  quickNotes: fc.array(
    fc.record({ private: fc.boolean(), section: fc.option(fc.integer({ min: 0, max: 6 }), { nil: null }), photo: fc.boolean() }),
    { maxLength: 5 },
  ),
});

type Plan = typeof planArb extends fc.Arbitrary<infer P> ? P : never;

interface Built {
  items: AnyItem[];
  /** Markers belonging to each item ID, including its copies in snapshots. */
  markers: Map<string, string[]>;
  fileOwner: Map<string, string>;
  isPrivate: Map<string, boolean>;
}

function build(plan: Plan): Built {
  let n = 0;
  const markers = new Map<string, string[]>();
  const fileOwner = new Map<string, string>();
  const isPrivate = new Map<string, boolean>();
  const items: AnyItem[] = [];
  const marker = (owner: string) => {
    const m = `ZQ${++n}X`;
    markers.set(owner, [...(markers.get(owner) ?? []), m]);
    return m;
  };
  let seq = 0;
  const add = <T extends ItemType>(type: T, id: string, data: ItemDataMap[T], priv = false) => {
    isPrivate.set(id, priv);
    const stamp = `2026-01-01T00:00:${String(seq++ % 60).padStart(2, '0')}.000Z`;
    items.push({ id, recordId: RECORD, type, schema: 1, private: priv, data, createdAt: stamp, updatedAt: stamp } as AnyItem);
  };
  const date = (i: number, past = true) => (past ? `2025-0${(i % 9) + 1}-1${i % 9}` : `2099-0${(i % 9) + 1}-1${i % 9}`);

  add('recordMeta', RECORD, blank('recordMeta', { name: 'Test record' }));

  if (plan.incident) {
    const id = 'incident';
    add('incident', id, {
      date: '2025-01-10',
      time: '09:00',
      place: marker(id),
      before: marker(id),
      what: marker(id),
      after: marker(id),
      told: marker(id),
      injuries: marker(id),
      witnesses: marker(id),
      services: marker(id),
      treatment: marker(id),
      complications: marker(id),
      ongoingCare: marker(id),
    });
  }
  if (plan.work) {
    const id = 'work';
    add('workDetails', id, blank('workDetails', { employer: marker(id), workplace: marker(id), jobTitle: marker(id), payrollRef: marker(id), reportedTo: marker(id) }));
  }

  const areaData = (owner: string, key: (typeof impactAreas)[number]['key']): ItemDataMap['impactArea'] => ({
    areaKey: key,
    difficulty: 'It is harder now',
    detail: marker(owner),
    help: marker(owner),
    aid: marker(owner),
    often: 'Most days',
    safety: marker(owner),
    timeLonger: marker(owner),
    standard: marker(owner),
  });
  const areaIds = plan.areas.map((a) => {
    const id = `area-${a.key}`;
    const def = impactAreas[a.key] ?? impactAreas[0];
    add('impactArea', id, areaData(id, def.key), a.private);
    return { id, key: def.key };
  });
  if (plan.note !== null) add('impactNote', 'note', { text: marker('note') }, plan.note);

  plan.snapshots.forEach((s, i) => {
    const copies = [...new Set(s.areas.map((x) => areaIds.length ? x % areaIds.length : -1))]
      .filter((x) => x >= 0)
      .map((x) => areaIds[x]!)
      .map((a) => ({ itemId: a.id, data: areaData(a.id, a.key) }));
    const note = s.withNote && plan.note !== null ? { itemId: 'note', text: marker('note') } : null;
    if (copies.length || note) add('impactSnapshot', `snap-${i}`, { date: date(i), areas: copies, note });
  });

  plan.checkIns.forEach((p, i) => {
    const id = `check-${i}`;
    add('checkIn', id, { date: date(i), pain: 'Medium', feeling: 'Okay', pulse: 70, note: marker(id) }, p);
  });

  const docIds = plan.documents.map((_, i) => `doc-${i}`);
  const allIds = () => items.map((i) => i.id);

  plan.documents.forEach((d, i) => {
    const id = docIds[i]!;
    const file = d.file ? { fileId: `file-${id}`, name: marker(id), type: 'application/pdf', size: 1 } : null;
    if (file) fileOwner.set(file.fileId, id);
    const targets = allIds();
    const related = d.related !== null && targets.length ? targets[d.related % targets.length]! : null;
    add(
      'document',
      id,
      blank('document', {
        title: marker(id),
        from: marker(id),
        date: date(i),
        point: marker(id),
        wording: marker(id),
        paperCopy: marker(id),
        relatedTo: related ? { section: 'treatment', itemId: related } : null,
        file,
      }),
      d.private,
    );
  });

  const linkDoc = (x: number | null) => (x !== null && docIds.length ? docIds[x % docIds.length]! : null);

  plan.appointments.forEach((a, i) => {
    const id = `appt-${i}`;
    add(
      'appointment',
      id,
      {
        date: date(i, a.past),
        time: '10:30',
        organisation: marker(id),
        person: marker(id),
        purpose: marker(id),
        location: marker(id),
        type: 'In person',
        told: marker(id),
        next: marker(id),
        documentId: linkDoc(a.doc),
      },
      a.private,
    );
  });
  plan.treatments.forEach((p, i) => {
    const id = `treat-${i}`;
    add('treatment', id, { name: marker(id), date: date(i), effect: 'Helped a little', note: marker(id) }, p);
  });
  plan.medications.forEach((m, i) => {
    const id = `med-${i}`;
    add(
      'medication',
      id,
      { name: marker(id), forWhat: marker(id), status: m.stopped ? 'Stopped' : 'Still taking', dose: marker(id), often: marker(id), started: date(i), effect: '', sideEffects: marker(id) },
      m.private,
    );
  });
  plan.costs.forEach((c, i) => {
    const id = `cost-${i}`;
    add(
      'cost',
      id,
      { kind: c.income ? 'income' : 'expense', date: date(i), dateTo: '', item: marker(id), amountPence: 100 + i, evidence: marker(id), documentId: linkDoc(c.doc) },
      c.private,
    );
  });
  plan.contacts.forEach((p, i) => {
    const id = `contact-${i}`;
    add('contact', id, { organisation: marker(id), role: marker(id), reference: marker(id), phoneOrEmail: marker(id) }, p);
  });
  plan.quickNotes.forEach((q, i) => {
    const id = `qn-${i}`;
    const photo = q.photo ? `file-${id}` : null;
    if (photo) fileOwner.set(photo, id);
    const section = q.section === null ? null : sections[q.section]!;
    add('quickNote', id, { text: marker(id), filedTo: section ? { section, impactArea: null } : null, photoFileId: photo }, q.private);
  });

  return { items, markers, fileOwner, isPrivate };
}

function outputsFor(built: Built, selectAll: boolean) {
  const { view } = toShareable(RECORD, built.items, 'Sam Example');
  return purposes.map((purpose) => {
    const selection = selectAll ? selectEverything(purpose, view) : defaultSelection(purpose, view, '2026-06-01');
    const report = buildReport(view, purpose, selection, { today: '2026-06-01' });
    return {
      purpose: purpose.key,
      text: reportText(report).join('\n') + '\n' + JSON.stringify(report),
      html: renderToStaticMarkup(<ReadingView report={report} />),
      pdf: pdfText(reportToPdf(report)).join('\n'),
      files: shareableFiles(view).map((f) => f.fileId),
    };
  });
}

function privateMarkers(built: Built): string[] {
  return [...built.markers].filter(([id]) => built.isPrivate.get(id)).flatMap(([, m]) => m);
}

describe('toShareable and reports never leak private items', () => {
  it('no private marker appears in any output, for every purpose and selection', () => {
    fc.assert(
      fc.property(planArb, fc.boolean(), (plan, selectAll) => {
        const built = build(plan);
        const secrets = privateMarkers(built);
        for (const out of outputsFor(built, selectAll)) {
          for (const secret of secrets) {
            expect(out.text, `${out.purpose}: ${secret}`).not.toContain(secret);
            expect(out.html, `${out.purpose}: ${secret}`).not.toContain(secret);
            expect(out.pdf, `${out.purpose}: ${secret}`).not.toContain(secret);
          }
          for (const fileId of out.files) {
            expect(built.isPrivate.get(built.fileOwner.get(fileId) ?? ''), `${out.purpose}: ${fileId}`).toBe(false);
          }
        }
      }),
      { numRuns: 400 },
    );
  }, 180_000);

  it('with everything selected, the full record includes every non-private marker', () => {
    fc.assert(
      fc.property(planArb, (plan) => {
        const built = build(plan);
        const full = outputsFor(built, true).find((o) => o.purpose === 'full-record')!;
        for (const [id, list] of built.markers) {
          if (built.isPrivate.get(id)) continue;
          for (const m of list) {
            expect(full.html, `${id}: ${m}`).toContain(m);
            expect(full.pdf, `${id}: ${m}`).toContain(m);
          }
        }
      }),
      { numRuns: 300 },
    );
  }, 180_000);

  it('no private marker or file appears in any zip: its file names, its pages or its attachments', async () => {
    await fc.assert(
      fc.asyncProperty(planArb, fc.boolean(), async (plan, selectAll) => {
        const built = build(plan);
        const secrets = privateMarkers(built);
        const secretFiles = [...built.fileOwner].filter(([, owner]) => built.isPrivate.get(owner)).map(([id]) => `BYTES-${id}-END`);
        // Every file's bytes are unique, so a private file can be spotted anywhere.
        const readFile = async (id: string) => new Blob([`BYTES-${id}-END`], { type: 'application/pdf' });
        const { view } = toShareable(RECORD, built.items, 'Sam Example');
        for (const purpose of purposes) {
          const selection = selectAll ? selectEverything(purpose, view) : defaultSelection(purpose, view, '2026-06-01');
          const report = buildReport(view, purpose, selection, { today: '2026-06-01' });
          const { zip } = await makeZip(report, new Blob(['%PDF']), readFile);
          const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
          if (selectAll && purpose.key === 'full-record') {
            // Over-filtering fails too: every letter that isn't private is there.
            const inZip = Object.values(entries).map((b) => strFromU8(b));
            for (const d of view.documents) {
              if (d.data.file) expect(inZip, d.id).toContain(`BYTES-${d.data.file.fileId}-END`);
            }
          }
          for (const [name, bytes] of Object.entries(entries)) {
            const text = strFromU8(bytes);
            for (const secret of [...secrets, ...secretFiles]) {
              // File names are lower-cased in the zip.
              expect(name.toLowerCase(), `${purpose.key}: ${secret}`).not.toContain(secret.toLowerCase());
              expect(text, `${purpose.key} ${name}: ${secret}`).not.toContain(secret);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  }, 240_000);

  it('counts exactly the private items it leaves out', () => {
    fc.assert(
      fc.property(planArb, (plan) => {
        const built = build(plan);
        const { excluded } = toShareable(RECORD, built.items);
        expect(excluded.total).toBe(built.items.filter((i) => i.private).length);
      }),
      { numRuns: 200 },
    );
  }, 60_000);

  it('the reading view and the PDF both show every piece of the model’s text', () => {
    fc.assert(
      fc.property(planArb, (plan) => {
        const built = build(plan);
        const { view } = toShareable(RECORD, built.items, 'Sam Example');
        for (const purpose of purposes) {
          const report = buildReport(view, purpose, selectEverything(purpose, view), { today: '2026-06-01' });
          const html = renderToStaticMarkup(<ReadingView report={report} />);
          const decoded = html.replace(/<[^>]+>/g, '\n').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
          const pdf = pdfText(reportToPdf(report));
          for (const text of reportText(report)) {
            expect(decoded).toContain(text);
            expect(pdf).toContain(text);
          }
        }
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});
