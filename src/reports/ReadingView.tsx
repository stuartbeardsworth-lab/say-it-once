import { madeWith, type Block, type Field, type Report } from './model';
import { reportWords } from './pdf';

// The reading view (docs/architecture.md, "Renderers"): the accessible
// version of a report, drawn from the document model with real headings,
// lists and tables. It follows the app's text size.

function Fields({ fields }: { fields: Field[] }) {
  return (
    <dl className="report-fields">
      {fields.map((f, i) => (
        <div key={`${f.label}-${i}`}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BlockView({ block, underSubheading }: { block: Block; underSubheading: boolean }) {
  switch (block.type) {
    case 'subheading':
      return <h3>{block.text}</h3>;
    case 'fields':
      return <Fields fields={block.fields} />;
    case 'paragraph':
      return <p className="note-text">{block.text}</p>;
    case 'list':
      return (
        <ul className="report-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'totals':
      return (
        <table className="report-totals">
          <tbody>
            {block.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'entry':
      return (
        <article className="report-entry">
          {underSubheading ? <h4>{block.heading}</h4> : <h3>{block.heading}</h3>}
          {block.fields.length > 0 && <Fields fields={block.fields} />}
          {block.paragraphs.map((p, i) => (
            <p key={i} className="note-text">
              {p}
            </p>
          ))}
        </article>
      );
  }
}

export interface ReadingViewProps {
  report: Report;
  /**
   * For the copy inside a zip: where each attachment sits, by its reference
   * (E1, P1…), so the index can link to it. Left out in the app.
   */
  fileLinks?: ReadonlyMap<string, string>;
  /** On a page of its own (the zip's copy), the report's title is the page's main heading. */
  standalone?: boolean;
}

export function ReadingView({ report, fileLinks, standalone = false }: ReadingViewProps) {
  const Title = standalone ? 'h1' : 'h2';
  const linked = (ref: string, text: string) => {
    const href = fileLinks?.get(ref);
    return href ? <a href={href}>{text}</a> : text;
  };
  return (
    <article className="report" aria-labelledby="report-title">
      <header className="report-header">
        <Title id="report-title">{report.title}</Title>
        <p>{report.intro}</p>
        <Fields
          fields={[
            ...(report.personName ? [{ label: reportWords.about, value: report.personName }] : []),
            { label: reportWords.record, value: report.recordName },
            { label: reportWords.prepared, value: report.preparedOn },
          ]}
        />
      </header>

      {report.sections.map((s) => (
        <section key={s.key} aria-labelledby={`report-${s.key}`} className="report-section">
          <h2 id={`report-${s.key}`}>{s.title}</h2>
          {s.blocks.map((b, i) => (
            // An entry is a level below the nearest sub-heading before it, so
            // heading levels never skip one.
            <BlockView key={i} block={b} underSubheading={s.blocks.slice(0, i).some((x) => x.type === 'subheading')} />
          ))}
        </section>
      ))}

      {report.evidence.length > 0 && (
        <section aria-labelledby="report-evidence" className="report-section">
          <h2 id="report-evidence">{reportWords.evidenceTitle(report.kind)}</h2>
          <table className="report-index">
            <thead>
              <tr>
                {reportWords.indexHeadings.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.evidence.map((e) => (
                <tr key={e.ref}>
                  <td>{e.ref}</td>
                  <td>{e.title}</td>
                  <td>{e.date}</td>
                  <td>{e.from}</td>
                  <td>{e.fileName ? linked(e.ref, e.fileName) : reportWords.paperOnly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {report.photos.length > 0 && (
        <section aria-labelledby="report-photos" className="report-section">
          <h2 id="report-photos">{reportWords.photosTitle}</h2>
          <table className="report-index">
            <thead>
              <tr>
                {reportWords.photoHeadings.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.photos.map((p) => (
                <tr key={p.ref}>
                  <td>{linked(p.ref, p.ref)}</td>
                  <td>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {report.signature && (
        <section aria-labelledby="report-confirmation" className="report-section">
          <h2 id="report-confirmation">{reportWords.confirmation}</h2>
          <p>{reportWords.confirm}</p>
          <dl className="report-signature">
            <div>
              <dt>Name</dt>
              <dd>{report.personName}</dd>
            </div>
            <div>
              <dt>Signature</dt>
              <dd />
            </div>
            <div>
              <dt>Date</dt>
              <dd />
            </div>
          </dl>
        </section>
      )}

      <footer className="report-footer">
        <p>{report.disclaimer}</p>
        <p className="report-brand">{madeWith}</p>
      </footer>
    </article>
  );
}
