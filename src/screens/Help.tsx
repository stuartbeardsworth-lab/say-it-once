import { useState } from 'react';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { faq } from '../content/faq';
import { TryExample } from '../features/example/TryExample';
import { PageTop } from '../shell/PageTop';

// One place for help (decided 27 September 2026): the four steps, the
// made-up record to try, then the questions and answers. Someone looking
// for help shouldn't first have to decide whether theirs is a "how to" or a
// "question". The old addresses (#how-to-use, #faq) open this screen too.

export function Help() {
  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Help</h1>
      <GettingStarted />
      <Questions />
    </>
  );
}

// The four steps (docs/spec.md, "journey"), describing only what the app does.
function GettingStarted() {
  return (
    <section aria-labelledby="getting-started">
      <h2 id="getting-started">Getting started</h2>
      <ol className="steps">
        <li>
          <h3>Record it</h3>
          <p>
            Write down what happened and how it affects you, in your own words. A few words are enough. Use a Quick Note
            when you just want to get something down.
          </p>
        </li>
        <li>
          <h3>Keep it together</h3>
          <p>
            Add appointments, treatment, costs, letters and contacts as they happen. Photos of letters are kept too.
          </p>
        </li>
        <li>
          <h3>Find it</h3>
          <p>Use Find in my record to look up anything, whenever you’re asked.</p>
        </li>
        <li>
          <h3>Use it</h3>
          <p>
            When you need to, Use my record puts together a report for a solicitor, your employer, the DWP or a doctor.
            You choose exactly what goes in, then share or save it as a PDF or a zip file. Anything marked private is
            always left out.
          </p>
        </li>
      </ol>
      <TryExample />
      <div className="button-row no-print">
        <Button onPress={() => window.print()}>Print these steps</Button>
      </div>
    </section>
  );
}

function Questions() {
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const topics = faq
    .map((t) => ({ ...t, questions: t.questions.filter((q) => matches([q.q, ...q.a].join(' '))) }))
    .filter((t) => t.questions.length > 0);
  const count = topics.reduce((n, t) => n + t.questions.length, 0);

  return (
    <section aria-labelledby="questions" className="no-print">
      <h2 id="questions">Questions and answers</h2>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <TextField label="Search the questions" type="search" value={query} onChange={setQuery} />
      </form>
      <p role="status" className="quiet-status">
        {words.length > 0 ? (count === 1 ? '1 question matches' : `${count} questions match`) : ''}
      </p>
      {topics.map((t) => (
        <section key={t.title} aria-labelledby={`faq-${t.title}`}>
          <h3 id={`faq-${t.title}`}>{t.title}</h3>
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
    </section>
  );
}
