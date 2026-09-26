import { describe, expect, it } from 'vitest';
import type { AnyItem } from '../domain/types';
import { validate } from '../domain/validate';
import { exampleItems } from '../fixtures/example';
import { buildReport, reportText } from '../reports/model';
import { purposeByKey, purposes } from '../reports/purposes';
import { candidates, defaultSelection, selectEverything } from '../reports/selection';
import { shareableFiles, toShareable } from './toShareable';

// The exact situations behind the old app's privacy leaks (docs/spec.md,
// D1 to D3), and marking something private after it appears in a snapshot.
// In the example record, every private entry's text contains "PRIVATE".

const today = '2026-06-01';
const items = exampleItems(today);
const { view, excluded } = toShareable('ex-record', items, 'Sam Taylor');

function textOf(purposeKey: string, everything = false) {
  const purpose = purposeByKey(purposeKey)!;
  const selection = everything ? selectEverything(purpose, view) : defaultSelection(purpose, view, today);
  return reportText(buildReport(view, purpose, selection, { today })).join('\n');
}

describe('the example record', () => {
  it('is valid, entry by entry', () => {
    for (const i of items) expect(validate(i.type, i.data as never, i.private), i.id).toEqual({ ok: true });
  });

  it('leaves out its private entries and says how many', () => {
    expect(excluded.total).toBe(items.filter((i) => i.private).length);
    expect(JSON.stringify(view)).not.toContain('PRIVATE');
  });
});

describe('D1: the chronology never includes private entries', () => {
  it.each(['full-record', 'personal-injury', 'iidb', 'treatment-concerns'])('%s', (key) => {
    const text = textOf(key, true);
    expect(text).toContain('Chronology');
    expect(text).not.toContain('PRIVATE');
  });
});

describe('D2: evidence packs never offer, pre-tick or ship private documents', () => {
  it.each(purposes.filter((p) => p.kind === 'evidence').map((p) => p.key))('%s', (key) => {
    const purpose = purposeByKey(key)!;
    expect(candidates(view, 'documents').map((c) => c.id)).not.toContain('ex-doc-private');
    const report = buildReport(view, purpose, defaultSelection(purpose, view, today), { today });
    expect(report.evidence.map((e) => e.documentId)).not.toContain('ex-doc-private');
    expect(shareableFiles(view).map((f) => f.fileId)).not.toContain('ex-file-private');
    expect(reportText(report).join('\n')).not.toContain('PRIVATE');
  });

  it('a private appointment’s letter link is removed, and its letter isn’t numbered', () => {
    expect(view.appointments.find((a) => a.id === 'ex-appt-private')).toBeUndefined();
  });
});

describe('D3 and late marking: privacy is judged now, not when a snapshot was taken', () => {
  it('a private area’s old version inside a snapshot is left out', () => {
    const snap = view.snapshots.find((s) => s.id === 'ex-snap-1')!;
    expect(snap.data.areas.map((a) => a.itemId)).toEqual(['ex-area-dress']);
    expect(textOf('full-record', true)).toContain('In a cast I needed help with all dressing.');
  });

  it('marking an area private later removes it from every future output, snapshots included', () => {
    const later: AnyItem[] = items.map((i) => (i.id === 'ex-area-dress' ? ({ ...i, private: true } as AnyItem) : i));
    const after = toShareable('ex-record', later, 'Sam Taylor').view;
    for (const purpose of purposes) {
      const text = reportText(buildReport(after, purpose, selectEverything(purpose, after), { today })).join('\n');
      expect(text, purpose.key).not.toContain('buttons or zips');
      expect(text, purpose.key).not.toContain('In a cast I needed help');
    }
  });

  it('marking the free-text note private later removes its copy from snapshots too', () => {
    const later: AnyItem[] = items.map((i) => (i.id === 'ex-note' ? ({ ...i, private: true } as AnyItem) : i));
    const after = toShareable('ex-record', later).view;
    expect(JSON.stringify(after)).not.toContain('I could not leave the house much.');
  });
});

describe('Quick Notes (D7)', () => {
  it('filed notes go in with their section by default, unfiled ones in Other notes', () => {
    const text = textOf('full-record');
    expect(text).toContain('squeeze the stress ball');
    expect(text).toContain('going back to lifting at work');
  });
});

describe('every purpose, from the example record', () => {
  it.each(purposes.map((p) => p.key))('%s', (key) => {
    expect(textOf(key)).toMatchSnapshot();
  });
});
