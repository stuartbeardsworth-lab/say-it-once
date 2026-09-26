import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Report } from './model';
import { ReadingView } from './ReadingView';

// The HTML copy inside the zip (docs/architecture.md, "Renderers"): the
// reading view as one self-contained page, with its own plain styles and no
// scripts, so it opens anywhere and works with screen readers. A PDF made
// this way isn't tagged for screen readers, which is why this copy exists.

const styles = `
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.5;
  max-width: 48rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; color: #1a1a1a; background: #fff; }
h2 { font-size: 1.4rem; margin: 2rem 0 0.5rem; }
h3 { font-size: 1.15rem; margin: 1.25rem 0 0.25rem; }
h4 { font-size: 1.05rem; margin: 1rem 0 0.25rem; }
h1 { font-size: 1.8rem; margin: 0 0 0.5rem; }
dl { margin: 0.25rem 0 1rem; }
dl > div { display: grid; grid-template-columns: minmax(8rem, 35%) 1fr; gap: 0 1rem; padding: 0.3rem 0;
  border-bottom: 1px solid #ccc; }
dt { font-weight: 600; }
dd { margin: 0; white-space: pre-wrap; }
.note-text { white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; }
th, td { text-align: left; vertical-align: top; padding: 0.35rem 0.5rem 0.35rem 0; border-bottom: 1px solid #ccc; }
.report-signature dd { min-height: 2.5rem; }
.report-footer { margin-top: 2rem; font-size: 0.9rem; color: #444; }
a { color: #1d4f5c; }
@media print { body { max-width: none; padding: 0; } }
`;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The report as a complete web page. `fileLinks` maps E1, P1… to the files beside it. */
export function reportHtml(report: Report, fileLinks: ReadonlyMap<string, string>): string {
  const body = renderToStaticMarkup(createElement(ReadingView, { report, fileLinks, standalone: true }));
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'">
<title>${escapeHtml(report.title)}</title>
<style>${styles}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}
