import { madeWith, type Block, type Field, type Report } from './model';

// The PDF renderer's first half (docs/architecture.md, "Renderers"): the
// document model turned into pdfmake's description of a document. It is
// plain data, built without pdfmake itself, so the tests can read every
// word that will be printed. makePdf.ts hands it to pdfmake to draw.
//
// Only the few pdfmake shapes used here are typed, rather than adding a
// separate types package.

export type PdfNode =
  | string
  | {
      text?: string | PdfNode[];
      stack?: PdfNode[];
      ul?: PdfNode[];
      table?: { widths: (string | number)[]; headerRows?: number; dontBreakRows?: boolean; body: PdfNode[][] };
      layout?: string | TableLayout;
      style?: string | string[];
      bold?: boolean;
      margin?: [number, number, number, number];
      tocItem?: boolean;
      toc?: { title: PdfNode };
      pageBreak?: 'before' | 'after';
      unbreakable?: boolean;
      headlineLevel?: number;
      id?: string;
    };

/** How pdfmake draws a table's lines and spacing. */
export interface TableLayout {
  hLineWidth: (line: number) => number;
  vLineWidth: () => number;
  hLineColor: () => string;
  paddingLeft: (column: number) => number;
  paddingRight: () => number;
  paddingTop: () => number;
  paddingBottom: () => number;
}

/** Light, even lines between rows, and none down the sides. */
const rows: TableLayout = {
  hLineWidth: (line) => (line === 0 ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => '#bbbbbb',
  paddingLeft: (column) => (column === 0 ? 0 : 8),
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

/** What pdfmake says about a piece of the document once it is laid out. */
interface PageNode {
  headlineLevel?: number;
  id?: string;
  text?: unknown;
  pageNumbers: number[];
}

interface PageQueries {
  getFollowingNodesOnPage: () => PageNode[];
}

export interface PdfDefinition {
  info: { title: string; creator: string; producer: string };
  pageSize: 'A4';
  pageMargins: [number, number, number, number];
  content: PdfNode[];
  /** Drawn by pdfmake on each page; not text from the record. */
  footer: (page: number, pages: number) => PdfNode;
  /** Starts a new page rather than leave a heading alone at the bottom of one. */
  pageBreakBefore: (node: PageNode, queries: PageQueries) => boolean;
  styles: Record<string, Record<string, unknown>>;
  defaultStyle: Record<string, unknown>;
}

/** The words each output adds around the record's own text, shared with the reading view. */
export const reportWords = {
  about: 'About',
  record: 'Record',
  prepared: 'Prepared',
  contents: 'Contents',
  evidenceTitle: (kind: Report['kind']) => (kind === 'evidence' ? 'Evidence index' : 'Documents referred to'),
  indexHeadings: ['Ref', 'Document', 'Date', 'From', 'File'],
  paperOnly: 'Paper copy only',
  photosTitle: 'Photos',
  photoHeadings: ['Ref', 'Kept with the Quick Note from'],
  confirmation: 'Confirmation',
  confirm: 'I confirm that this is my own account, to the best of my knowledge.',
  signatureLabels: ['Name', 'Signature', 'Date'],
};

function fieldTable(fields: Field[]): PdfNode {
  return {
    table: {
      widths: ['35%', '*'],
      dontBreakRows: true,
      body: fields.map((f) => [{ text: f.label, style: 'label' }, { text: f.value }]),
    },
    layout: rows,
    margin: [0, 2, 0, 8],
  };
}

function blockNodes(block: Block, underSubheading: boolean): PdfNode[] {
  switch (block.type) {
    case 'subheading':
      return [{ text: block.text, style: 'subheading', headlineLevel: 3 }];
    case 'fields':
      return [fieldTable(block.fields)];
    case 'paragraph':
      return [{ text: block.text, margin: [0, 0, 0, 8] }];
    case 'list':
      return [{ ul: block.items.map((text) => ({ text })), margin: [0, 0, 0, 8] }];
    case 'totals':
      return [fieldTable(block.rows)];
    case 'entry': {
      const heading: PdfNode = { text: block.heading, style: underSubheading ? 'h4' : 'h3', headlineLevel: underSubheading ? 4 : 3 };
      const paragraphs = block.paragraphs.map((text): PdfNode => ({ text, margin: [0, 0, 0, 8] }));
      const first: PdfNode | undefined = block.fields.length ? fieldTable(block.fields) : paragraphs.shift();
      // An entry's heading and its details stay together on one page, when
      // they fit on one; a very long entry is left to flow across pages.
      if (!first) return [heading];
      return isSmall(first) ? [{ stack: [heading, first], unbreakable: true }, ...paragraphs] : [heading, first, ...paragraphs];
    }
  }
}

/** Small enough to be moved to the next page whole, along with a heading. */
function isSmall(node: PdfNode): boolean {
  if (typeof node === 'string') return true;
  if (node.table) return node.table.body.length <= 12;
  if (node.ul) return node.ul.length <= 12;
  if (typeof node.text === 'string') return node.text.length < 800;
  return false;
}

/**
 * A section heading or sub-heading joins what comes straight after it, so
 * it's never left alone at the foot of a page.
 */
function keepHeadingsWithNext(nodes: PdfNode[]): PdfNode[] {
  // Working from the end means a section heading followed by a sub-heading
  // joins the sub-heading and its entry together.
  const out: PdfNode[] = [];
  for (const node of [...nodes].reverse()) {
    const next = out[0];
    const isHeading = typeof node === 'object' && (node.style === 'subheading' || node.style === 'h2');
    if (isHeading && typeof next === 'object' && next.unbreakable && next.stack) {
      out[0] = { ...next, stack: [node, ...next.stack] };
    } else if (isHeading && next !== undefined && isSmall(next)) {
      out[0] = { stack: [node, next], unbreakable: true };
    } else out.unshift(node);
  }
  return out;
}

export function reportToPdf(report: Report): PdfDefinition {
  const content: PdfNode[] = [
    { text: report.title, style: 'h1' },
    { text: report.intro, margin: [0, 0, 0, 8] },
    fieldTable([
      ...(report.personName ? [{ label: reportWords.about, value: report.personName }] : []),
      { label: reportWords.record, value: report.recordName },
      { label: reportWords.prepared, value: report.preparedOn },
    ]),
  ];

  // A contents page helps once a report runs to several sections.
  const headings = report.sections.length;
  if (headings > 5) content.push({ toc: { title: { text: reportWords.contents, style: 'h2' } }, margin: [0, 0, 0, 8] });

  report.sections.forEach((s, index) => {
    const nodes: PdfNode[] = [
      { text: s.title, style: 'h2', tocItem: true, headlineLevel: 2 },
      ...s.blocks.flatMap((b, i) => blockNodes(b, s.blocks.slice(0, i).some((x) => x.type === 'subheading'))),
    ];
    // After a contents page, the first section starts on a new page.
    const [first, ...rest] = keepHeadingsWithNext(nodes);
    if (first) content.push(index === 0 && headings > 5 && typeof first === 'object' ? { ...first, pageBreak: 'before' } : first, ...rest);
  });

  if (report.evidence.length) {
    content.push({ text: reportWords.evidenceTitle(report.kind), style: 'h2', tocItem: true, headlineLevel: 2 });
    content.push({
      table: {
        widths: ['auto', '*', 'auto', 'auto', 'auto'],
        headerRows: 1,
        dontBreakRows: true,
        body: [
          reportWords.indexHeadings.map((text) => ({ text, style: 'label' })),
          ...report.evidence.map((e) => [
            { text: e.ref },
            { text: e.title },
            { text: e.date },
            { text: e.from },
            { text: e.fileName ?? reportWords.paperOnly },
          ]),
        ],
      },
      layout: rows,
      margin: [0, 2, 0, 8],
    });
  }

  if (report.photos.length) {
    content.push({
      stack: [
        { text: reportWords.photosTitle, style: 'h2', tocItem: true, headlineLevel: 2 },
        {
          table: {
            widths: ['auto', '*'],
            headerRows: 1,
            dontBreakRows: true,
            body: [
              reportWords.photoHeadings.map((text) => ({ text, style: 'label' })),
              ...report.photos.map((p) => [{ text: p.ref }, { text: p.date }]),
            ],
          },
          layout: rows,
          margin: [0, 2, 0, 8],
        },
      ],
      unbreakable: report.photos.length <= 12,
    });
  }

  if (report.signature) {
    content.push({
      stack: [
        { text: reportWords.confirmation, style: 'h2', tocItem: true, headlineLevel: 2 },
        { text: reportWords.confirm, margin: [0, 0, 0, 12] },
        {
          table: {
            widths: ['25%', '*'],
            body: reportWords.signatureLabels.map((label) => [
              { text: label, style: 'label', margin: [0, 10, 0, 10] },
              { text: label === 'Name' ? report.personName : '', margin: [0, 10, 0, 10] },
            ]),
          },
          layout: rows,
        },
      ],
      unbreakable: true,
    });
  }

  content.push({ text: report.disclaimer, style: 'small', margin: [0, 16, 0, 0] });

  return {
    // The title only: the person's name isn't put in the file's hidden details.
    info: { title: report.title, creator: 'Say It Once', producer: 'Say It Once' },
    pageSize: 'A4',
    pageMargins: [56, 56, 56, 64],
    content,
    // A heading moves to the next page when no words follow it on this one.
    pageBreakBefore: (node, queries) => {
      if (node.headlineLevel === undefined) return false;
      const page = node.pageNumbers[0];
      return !queries
        .getFollowingNodesOnPage()
        .some((n) => !n.id?.startsWith('page-footer') && n.text !== undefined && n.pageNumbers[0] === page);
    },
    // Each line's id starts "page-footer", so headings never count the footer
    // as words following them on the page. pdfmake needs every id to differ.
    footer: (page, pages) => ({
      id: 'page-footer',
      stack: [
        { id: 'page-footer-number', text: `${report.title} · Page ${page} of ${pages}`, style: 'small' },
        { id: 'page-footer-brand', text: madeWith, style: 'small' },
      ],
      margin: [56, 16, 56, 0],
    }),
    styles: {
      h1: { fontSize: 20, bold: true, margin: [0, 0, 0, 8] },
      h2: { fontSize: 15, bold: true, margin: [0, 16, 0, 6] },
      h3: { fontSize: 12.5, bold: true, margin: [0, 10, 0, 4] },
      subheading: { fontSize: 12.5, bold: true, margin: [0, 10, 0, 4] },
      h4: { fontSize: 11.5, bold: true, margin: [0, 8, 0, 4] },
      label: { bold: true },
      small: { fontSize: 9, color: '#444444' },
    },
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.25 },
  };
}

/** Every piece of text in a PDF description, in order. Used to prove the PDF says what the report says. */
export function pdfText(definition: PdfDefinition): string[] {
  const out: string[] = [];
  const walk = (node: PdfNode | undefined): void => {
    if (node === undefined) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (typeof node.text === 'string') out.push(node.text);
    else if (Array.isArray(node.text)) node.text.forEach(walk);
    node.stack?.forEach(walk);
    node.ul?.forEach(walk);
    node.table?.body.forEach((row) => row.forEach(walk));
    if (node.toc) walk(node.toc.title);
  };
  definition.content.forEach(walk);
  return out.filter((t) => t !== '');
}
