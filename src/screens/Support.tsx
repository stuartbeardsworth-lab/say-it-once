import { support, type SupportContact } from '../content/support';
import { PageTop } from '../shell/PageTop';

function Contact({ c }: { c: SupportContact }) {
  return (
    <li className="note-card">
      <h3 className="entry-title">{c.name}</h3>
      <p>{c.description}</p>
      {c.phone && (
        <p>
          Call <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
        </p>
      )}
      {c.url && (
        <p>
          <a href={c.url} target="_blank" rel="noopener noreferrer">
            {c.name} website<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </p>
      )}
    </li>
  );
}

export function Support() {
  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Find support</h1>
      <section aria-labelledby="urgent-heading" className="notice notice-info">
        <h2 id="urgent-heading">If you need help now</h2>
        <ul className="entry-list">
          {support.urgent.map((c) => (
            <Contact key={c.name} c={c} />
          ))}
        </ul>
      </section>
      <h2>Organisations that can help</h2>
      <p>Charities with information, helplines and people who understand.</p>
      {support.groups.map((g) => (
        <details key={g.title} className="more">
          <summary>{g.title}</summary>
          <ul className="entry-list">
            {g.organisations.map((c) => (
              <Contact key={c.name} c={c} />
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}
