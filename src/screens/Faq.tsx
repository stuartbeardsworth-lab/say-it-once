import { useState } from 'react';
import { TextField } from '../components/TextField';
import { faq } from '../content/faq';
import { RouteLink } from '../router';
import { PageTop } from '../shell/PageTop';

export function Faq() {
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const topics = faq
    .map((t) => ({ ...t, questions: t.questions.filter((q) => matches([q.q, ...q.a].join(' '))) }))
    .filter((t) => t.questions.length > 0);
  const count = topics.reduce((n, t) => n + t.questions.length, 0);

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Questions and answers</h1>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <TextField label="Search the questions" type="search" value={query} onChange={setQuery} />
      </form>
      <p role="status" className="quiet-status">
        {words.length > 0 ? (count === 1 ? '1 question matches' : `${count} questions match`) : ''}
      </p>
      {topics.map((t) => (
        <section key={t.title} aria-labelledby={`faq-${t.title}`}>
          <h2 id={`faq-${t.title}`}>{t.title}</h2>
          {t.questions.map((q) => (
            <details key={q.q} className="more faq-item" open={words.length > 0}>
              <summary>{q.q}</summary>
              {q.a.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </details>
          ))}
        </section>
      ))}
      {count === 0 && <p>No questions match that. Try another word.</p>}
      <p>
        See also <RouteLink to="how-to-use">How to use Say It Once</RouteLink>.
      </p>
    </>
  );
}
