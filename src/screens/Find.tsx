import { useId, useState } from 'react';
import { TextField } from '../components/TextField';
import { readableDate } from '../domain/format';
import type { AnyItem } from '../domain/types';
import { formatPence } from '../domain/money';
import { filters, isSearchable, kindLabels, quickAnswers, screenFor, search, titleOf, type FilterKey, type SearchableItem } from '../domain/search';
import { navigate } from '../router';
import { handOverResults } from '../features/use/handoff';
import { Button } from '../components/Button';
import { PageTop } from '../shell/PageTop';
import { useRecordId, useStore } from '../store/StoreContext';
import { useLiveQuery } from '../store/useLiveQuery';

// Find in my record (docs/spec.md, "Find in my record"), without question
// guessing: plain search, filters, and answers read straight from entries.

export function Find() {
  const { store } = useStore();
  const recordId = useRecordId();
  const filterId = useId();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const items = useLiveQuery(() => (recordId ? store.listAll(recordId) : Promise.resolve([])), `all:${recordId ?? ''}`);
  const history = useLiveQuery(
    () => (recordId ? store.openedHistory(recordId) : Promise.resolve({ recent: [], often: [] })),
    `history:${recordId ?? ''}`,
  );

  const all = ((items ?? []) as AnyItem[]).filter(isSearchable);
  const results = search(all, query, filter);
  const answers = quickAnswers(all);
  const byId = new Map(all.map((i) => [i.id, i]));

  function open(item: SearchableItem) {
    if (recordId) void store.noteOpened(recordId, item.id).catch(() => undefined);
    navigate(screenFor[item.type]);
  }

  const entryButton = (item: SearchableItem) => (
    <button type="button" className="link-button" onClick={() => open(item)}>
      {titleOf(item)}
    </button>
  );

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Find in my record</h1>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <TextField
          label="Search your record"
          hint="For example, a name, a place, a medicine or a word from a letter."
          type="search"
          value={query}
          onChange={setQuery}
        />
        <div className="field">
          <label className="field-label" htmlFor={filterId}>
            Show
          </label>
          <select id={filterId} className="field-input" value={filter} onChange={(e) => setFilter(e.target.value as FilterKey)}>
            {filters.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p role="status" className="quiet-status">
        {query.trim() ? (results.length === 1 ? '1 result' : `${results.length} results`) : ''}
      </p>

      {query.trim() !== '' && results.length > 0 && (
        <div className="button-row">
          <Button
            variant="primary"
            onPress={() => {
              handOverResults(results.map((r) => r.item.id));
              navigate('use');
            }}
          >
            Use these results in a report
          </Button>
        </div>
      )}

      {query.trim() !== '' && results.length > 0 && (
        <ul className="entry-list">
          {results.map((r) => (
            <li key={r.item.id} className="note-card">
              <p className="entry-meta">
                {r.kind}
                {r.item.private && ' · Private'}
              </p>
              <h2 className="entry-title">{entryButton(r.item)}</h2>
              <p className="note-text">{r.snippet}</p>
            </li>
          ))}
        </ul>
      )}

      {query.trim() === '' && (
        <>
          <section aria-labelledby="answers-heading">
            <h2 id="answers-heading">Quick answers</h2>
            <dl className="answers">
              <div>
                <dt>Money spent</dt>
                <dd>{formatPence(answers.spentPence)}</dd>
              </div>
              <div>
                <dt>Income lost</dt>
                <dd>{formatPence(answers.lostPence)}</dd>
              </div>
              <div>
                <dt>Medication I’m taking</dt>
                <dd>
                  {answers.currentMedication.length === 0
                    ? 'None recorded'
                    : answers.currentMedication.map((m) => m.data.name).join(', ')}
                </dd>
              </div>
              <div>
                <dt>My next appointment</dt>
                <dd>
                  {answers.nextAppointment
                    ? `${readableDate(answers.nextAppointment.data.date)}, ${answers.nextAppointment.data.organisation}`
                    : 'None coming up'}
                </dd>
              </div>
            </dl>
          </section>

          {history && history.recent.length > 0 && (
            <section aria-labelledby="recent-heading">
              <h2 id="recent-heading">Recently opened</h2>
              <ul className="plain-list">
                {history.recent.flatMap((id) => {
                  const item = byId.get(id);
                  return item ? [<li key={id}>{entryButton(item)} <span className="field-hint">· {kindLabels[item.type]}</span></li>] : [];
                })}
              </ul>
            </section>
          )}
          {history && history.often.length > 0 && (
            <section aria-labelledby="often-heading">
              <h2 id="often-heading">Often needed</h2>
              <ul className="plain-list">
                {history.often.flatMap((id) => {
                  const item = byId.get(id);
                  return item ? [<li key={id}>{entryButton(item)} <span className="field-hint">· {kindLabels[item.type]}</span></li>] : [];
                })}
              </ul>
            </section>
          )}
        </>
      )}
      {query.trim() !== '' && results.length === 0 && items !== undefined && (
        <p>Nothing in your record matches that. Try a different word, or fewer words.</p>
      )}
    </>
  );
}
