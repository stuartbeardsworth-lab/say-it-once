import { reportToPdf } from './pdf';
import type { Report } from './model';

// The PDF renderer's second half: pdfmake draws the description from pdf.ts
// into a PDF file, on this device. pdfmake and its font are large, so they
// are loaded the first time someone makes a PDF, not when the app starts.
// The font (Roboto, which comes with pdfmake) is part of the app's own
// files; nothing is fetched from anywhere else.

interface PdfMake {
  addVirtualFileSystem(vfs: Record<string, string>): void;
  setUrlAccessPolicy(allow: (url: string) => boolean): void;
  createPdf(definition: unknown): { getBlob(): Promise<Blob> };
}

let loading: Promise<PdfMake> | null = null;

/**
 * A CommonJS module can arrive wrapped in one or two `default`s, depending on
 * the bundler. The innermost match is used, so the wrapper's own `default`
 * entry is never mistaken for part of the contents (such as a font).
 */
function unwrap<T>(module: unknown, has: (value: unknown) => boolean): T {
  const inner = (value: unknown) => (value && typeof value === 'object' ? (value as { default?: unknown }).default : undefined);
  const found = [inner(inner(module)), inner(module), module].find((value) => value && has(value));
  if (!found) throw new Error('The PDF maker did not load properly');
  return found as T;
}

function loadPdfMake(): Promise<PdfMake> {
  loading ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
    .then(([pdfModule, fontModule]) => {
      const pdfMake = unwrap<PdfMake>(pdfModule, (v) => typeof (v as PdfMake).createPdf === 'function');
      const fonts = unwrap<Record<string, string>>(fontModule, (v) => typeof (v as Record<string, unknown>)['Roboto-Regular.ttf'] === 'string');
      pdfMake.addVirtualFileSystem(fonts);
      // Reports never contain links to images or fonts elsewhere; refuse them all the same.
      pdfMake.setUrlAccessPolicy(() => false);
      return pdfMake;
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}

/** Longest side of a picture in the PDF, in pixels: sharp on a page, small enough to email. */
const pictureSize = 1400;

/**
 * A photo, shrunk and turned into a JPEG data: URL for pdfmake, or null if
 * it isn't a picture this browser can draw (such as a PDF letter). The
 * picture never leaves the device; it's drawn onto a canvas here.
 */
async function pictureFor(blob: Blob): Promise<string | null> {
  if (!blob.type.startsWith('image/')) return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, pictureSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    // A white page behind see-through pictures, since JPEG has no transparency.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}

/**
 * Makes the report's PDF. With `readFile`, photos of letters and Quick Note
 * photos are shown in it too, one at a time; a picture that can't be read or
 * drawn is simply left to the zip, which names anything missing.
 */
export async function makePdf(
  report: Report,
  readFile?: (fileId: string) => Promise<Blob | undefined>,
): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const pictures = new Map<string, string>();
  if (readFile) {
    const files = [
      ...report.evidence.flatMap((e) => (e.fileId ? [{ ref: e.ref, fileId: e.fileId }] : [])),
      ...report.photos.map((p) => ({ ref: p.ref, fileId: p.fileId })),
    ];
    for (const f of files) {
      const blob = await readFile(f.fileId).catch(() => undefined);
      const picture = blob ? await pictureFor(blob) : null;
      if (picture) pictures.set(f.ref, picture);
    }
  }
  return pdfMake.createPdf(reportToPdf(report, pictures)).getBlob();
}
