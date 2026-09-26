// @vitest-environment node
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exampleRecord, exampleItems } from '../fixtures/example';
import { toShareable } from '../shareable/toShareable';
import { buildReport, reportText } from './model';
import { purposeByKey } from './purposes';
import { selectEverything } from './selection';
import { makeZip } from './zip';

// The zip holds the PDF, the HTML copy and exactly the files the report
// refers to, named by their references.

const today = '2026-06-01';
const { view } = toShareable('ex-record', exampleItems(today), 'Sam Taylor');
const files = new Map(
  exampleRecord(today).entries.flatMap((e) => {
    const data = e.data as { file?: { fileId: string } | null; photoFileId?: string | null };
    const id = data.file?.fileId ?? data.photoFileId;
    return id && e.file ? [[id, new Blob([e.file.text], { type: e.file.type })] as const] : [];
  }),
);
const readFile = async (id: string) => files.get(id);
const pdf = new Blob(['%PDF-1.3 pretend'], { type: 'application/pdf' });

function reportFor(key: string) {
  const purpose = purposeByKey(key)!;
  return buildReport(view, purpose, selectEverything(purpose, view), { today });
}

async function open(zip: Blob) {
  return unzipSync(new Uint8Array(await zip.arrayBuffer()));
}

describe('the zip', () => {
  it('holds the PDF, the HTML copy, and each letter and photo by its reference', async () => {
    const report = reportFor('full-record');
    const { zip, missing } = await makeZip(report, pdf, readFile);
    expect(missing).toEqual([]);
    const entries = await open(zip);
    // E2, the taxi receipts, is a paper copy only, so it has no file.
    expect(Object.keys(entries).sort()).toEqual([
      'attachments/E1-discharge-letter.pdf',
      'attachments/E3-fracture-clinic-letter.pdf',
      'attachments/P1-photo.png',
      'report.html',
      'report.pdf',
    ]);
    expect(strFromU8(entries['report.pdf']!)).toBe('%PDF-1.3 pretend');
    expect(strFromU8(entries['attachments/E1-discharge-letter.pdf']!)).toBe('Example discharge letter (fictional).');
  });

  it('has an HTML copy with all of the report’s text, links to the files, and no scripts', async () => {
    const report = reportFor('full-record');
    const entries = await open((await makeZip(report, pdf, readFile)).zip);
    const html = strFromU8(entries['report.html']!);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('href="attachments/E1-discharge-letter.pdf"');
    expect(html).toContain('href="attachments/P1-photo.png"');
    const text = html.replace(/<[^>]+>/g, '\n').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
    for (const t of reportText(report)) expect(text).toContain(t);
  });

  it('never contains anything private', async () => {
    for (const key of ['full-record', 'personal-injury', 'pip']) {
      const entries = await open((await makeZip(reportFor(key), pdf, readFile)).zip);
      for (const [name, bytes] of Object.entries(entries)) {
        expect(name).not.toMatch(/private/i);
        expect(strFromU8(bytes)).not.toContain('PRIVATE');
      }
    }
  });

  it('says which files it couldn’t find, rather than leaving them out quietly', async () => {
    const report = reportFor('full-record');
    const { zip, missing } = await makeZip(report, pdf, async (id) => (id === 'ex-file-discharge' ? undefined : files.get(id)));
    expect(missing).toEqual(['E1']);
    expect(Object.keys(await open(zip))).not.toContain('attachments/E1-discharge-letter.pdf');
  });
});
