import { strToU8, Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { reportHtml } from './html';
import type { Report } from './model';

// The zip (docs/architecture.md, "Renderers"): report.pdf, report.html, and
// the letters and photos the report refers to, named by their references so
// they match the index: attachments/E1-discharge-letter.pdf, P1-photo.png.
//
// Files are read one at a time and written straight into the zip, so only
// one file is held in memory at once. Files that are already compressed
// (PDFs, photos) are stored as they are; the HTML page is compressed.

export interface Attachment {
  ref: string;
  fileId: string;
  /** Where it sits inside the zip. */
  path: string;
}

/** A file name that works on every system: letters, numbers and dashes. */
function slug(text: string): string {
  return (
    text
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'file'
  );
}

const extensions: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function extensionOf(name: string | null, type: string): string {
  const fromName = name && /\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1];
  return (fromName ?? extensions[type] ?? 'bin').toLowerCase();
}

/** Every attachment the report refers to. Only files named in the report, which come from the shareable view. */
export function attachmentsOf(report: Report, typeOf: (fileId: string) => string = () => ''): Attachment[] {
  return [
    ...report.evidence
      .filter((e): e is typeof e & { fileId: string } => e.fileId !== null)
      .map((e) => ({
        ref: e.ref,
        fileId: e.fileId,
        path: `attachments/${e.ref}-${slug((e.fileName ?? e.title).replace(/\.[A-Za-z0-9]{1,8}$/, ''))}.${extensionOf(e.fileName, typeOf(e.fileId))}`,
      })),
    ...report.photos.map((p) => ({
      ref: p.ref,
      fileId: p.fileId,
      path: `attachments/${p.ref}-photo.${extensionOf(null, typeOf(p.fileId))}`,
    })),
  ];
}

export interface ZipResult {
  zip: Blob;
  /** References whose file couldn't be read, so they aren't in the zip. */
  missing: string[];
}

export async function makeZip(
  report: Report,
  pdf: Blob,
  readFile: (fileId: string) => Promise<Blob | undefined>,
): Promise<ZipResult> {
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

  add('report.pdf', new Uint8Array(await pdf.arrayBuffer()), false);

  // Each file is read, named by its type, and written before the next is read.
  const links = new Map<string, string>();
  const missing: string[] = [];
  for (const planned of attachmentsOf(report)) {
    const blob = await readFile(planned.fileId);
    if (!blob) {
      missing.push(planned.ref);
      continue;
    }
    const [attachment] = attachmentsOf(report, () => blob.type).filter((a) => a.ref === planned.ref);
    if (!attachment) continue;
    add(attachment.path, new Uint8Array(await blob.arrayBuffer()), false);
    links.set(attachment.ref, attachment.path);
  }

  // The page last, once it's known which files it can link to.
  add('report.html', strToU8(reportHtml(report, links)), true);
  zip.end();
  return { zip: await done, missing };
}
