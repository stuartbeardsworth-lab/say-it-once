import { readableDate } from '../domain/format';
import type { ImpactAreaData, Item } from '../domain/types';
import { impactAreaLabel, impactAreas } from '../domain/vocab';
import { PageTop } from '../shell/PageTop';
import { useItems, useRecords } from '../store/hooks';
import { useRecordId } from '../store/StoreContext';

// Changes over time: read-only. Check-ins, each earlier position kept by
// "Something has changed", and the current position.

function sortAreas<T extends { data: ImpactAreaData }>(list: T[]): T[] {
  return impactAreas.flatMap((def) => list.filter((a) => a.data.areaKey === def.key));
}

function AreaSummary({ data }: { data: ImpactAreaData }) {
  return (
    <li>
      <strong>{impactAreaLabel(data.areaKey)}</strong>
      {data.difficulty && `: ${data.difficulty}`}
      {data.detail && <p className="note-text">{data.detail}</p>}
    </li>
  );
}

export function Changes() {
  const recordId = useRecordId();
  const records = useRecords();
  const since = records?.find((r) => r.id === recordId)?.data.impactCurrentSince;
  const areas = useItems('impactArea');
  const notes = useItems('impactNote');
  const snapshots = useItems('impactSnapshot');
  const checkIns = useItems('checkIn');
  const note = notes?.[0];

  const earlier = [...(snapshots ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const checks = [...(checkIns ?? [])].sort((a, b) => b.data.date.localeCompare(a.data.date));

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Changes over time</h1>
      <p>How things have been, from your own entries. Nothing here can be edited.</p>

      <section aria-labelledby="now-heading">
        <h2 id="now-heading">How things are now{since ? `, since ${readableDate(since)}` : ''}</h2>
        {(areas ?? []).length === 0 && !note?.data.text ? (
          <p>Nothing described yet.</p>
        ) : (
          <ul className="plain-list">
            {sortAreas(areas ?? []).map((a) => (
              <AreaSummary key={a.id} data={a.data} />
            ))}
            {note?.data.text && (
              <li>
                <strong>Anything else</strong>
                <p className="note-text">{note.data.text}</p>
              </li>
            )}
          </ul>
        )}
      </section>

      {earlier.map((s: Item<'impactSnapshot'>, i) => {
        const until = i === 0 ? since : earlier[i - 1]?.data.date;
        return (
          <section key={s.id} aria-labelledby={`snap-${s.id}`}>
            <h2 id={`snap-${s.id}`}>
              Earlier: from {readableDate(s.data.date)}
              {until ? ` to ${readableDate(until)}` : ''}
            </h2>
            <ul className="plain-list">
              {sortAreas(s.data.areas).map((a) => (
                <AreaSummary key={a.itemId} data={a.data} />
              ))}
              {s.data.note && (
                <li>
                  <strong>Anything else</strong>
                  <p className="note-text">{s.data.note.text}</p>
                </li>
              )}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading">Check-ins</h2>
        {checks.length === 0 ? (
          <p>No check-ins yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Pain</th>
                  <th scope="col">How I feel</th>
                  <th scope="col">Pulse</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id}>
                    <td>{readableDate(c.data.date)}</td>
                    <td>{c.data.pain || '–'}</td>
                    <td>{c.data.feeling || '–'}</td>
                    <td>{c.data.pulse ?? '–'}</td>
                    <td>{c.data.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
