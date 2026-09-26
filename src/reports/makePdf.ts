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

export async function makePdf(report: Report): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  return pdfMake.createPdf(reportToPdf(report)).getBlob();
}
