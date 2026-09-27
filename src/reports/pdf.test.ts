import { describe, expect, it } from 'vitest';
import { exampleItems } from '../fixtures/example';
import { toShareable } from '../shareable/toShareable';
import { buildReport, reportText } from './model';
import { pdfText, reportToPdf } from './pdf';
import { purposeByKey, purposes } from './purposes';
import { defaultSelection, selectEverything } from './selection';

// The PDF says exactly what the report model says, in the same order, with
// the same E-references. The privacy property test covers random records;
// these use the example record.

const today = '2026-06-01';
const { view } = toShareable('ex-record', exampleItems(today), 'Sam Taylor');

function reportFor(key: string, everything = false) {
  const purpose = purposeByKey(key)!;
  const selection = everything ? selectEverything(purpose, view) : defaultSelection(purpose, view, today);
  return buildReport(view, purpose, selection, { today });
}

/** Whether `inner` appears within `outer` in the same order, with anything in between. */
function inOrder(inner: string[], outer: string[]) {
  let at = 0;
  for (const text of inner) {
    at = outer.indexOf(text, at);
    if (at === -1) return false;
    at++;
  }
  return true;
}

describe('the PDF', () => {
  it.each(purposes.map((p) => p.key))('%s has all of the report’s text, in order', (key) => {
    const report = reportFor(key);
    const pdf = pdfText(reportToPdf(report));
    expect(inOrder(reportText(report), pdf)).toBe(true);
    expect(pdf.join('\n')).not.toContain('PRIVATE');
  });

  it('lists the evidence with the same references as the report', () => {
    const report = reportFor('pip', true);
    expect(report.evidence.length).toBeGreaterThan(0);
    const pdf = pdfText(reportToPdf(report));
    expect(pdf).toContain('Evidence index');
    for (const e of report.evidence) expect(pdf).toContain(e.ref);
  });

  it('has signature lines only when the purpose asks for them', () => {
    expect(pdfText(reportToPdf(reportFor('pip')))).toContain('Signature');
    expect(pdfText(reportToPdf(reportFor('appointment-brief')))).not.toContain('Signature');
  });

  it('has a contents page for longer reports, and page numbers', () => {
    const long = reportToPdf(reportFor('full-record', true));
    expect(pdfText(long)).toContain('Contents');
    expect(pdfText({ ...long, content: [long.footer(2, 7)] })).toEqual([
      'Full record · Page 2 of 7',
      'Made with Say It Once · Record it, keep it together, use it when you need it',
    ]);
    expect(pdfText(reportToPdf(reportFor('appointment-brief')))).not.toContain('Contents');
  });

  it('says where the letters themselves are', () => {
    const report = reportFor('pip', true);
    expect(report.evidence.some((e) => e.fileId)).toBe(true);
    const text = pdfText(reportToPdf(report)).join('\n');
    expect(text).toContain('The letters themselves come in the zip file made from this report');
    expect(text).not.toContain('Photos are also shown');
  });

  it('shows pictures it is given, under their references, and no others', () => {
    const report = reportFor('pip', true);
    const photo = report.photos[0];
    expect(photo).toBeDefined();
    const picture = 'data:image/jpeg;base64,AAAA';
    const definition = reportToPdf(report, new Map([[photo!.ref, picture], ['E99', picture]]));
    const text = pdfText(definition);
    expect(text).toContain('Pictures');
    expect(text.join('\n')).toContain('Photos are also shown at the end of this PDF.');
    expect(text.some((t) => t.startsWith(`${photo!.ref}: `))).toBe(true);
    // Only references in the report are drawn; a stray one is ignored.
    const images = JSON.stringify(definition.content).match(/"image"/g) ?? [];
    expect(images).toHaveLength(1);
    expect(text.join('\n')).not.toContain('E99');
  });

  it('has no Pictures section without pictures', () => {
    expect(pdfText(reportToPdf(reportFor('pip', true)))).not.toContain('Pictures');
  });

  it('keeps the person’s name out of the file’s hidden details', () => {
    const definition = reportToPdf(reportFor('pip'));
    expect(JSON.stringify(definition.info)).not.toContain('Sam');
  });
});
