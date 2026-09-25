import { useState } from 'react';
import { Button } from '../components/Button';
import { readableDate } from '../domain/format';
import { formatPence } from '../domain/money';
import type { Item } from '../domain/types';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { CostDialog, type CostEdit } from '../features/track/CostDialog';
import { PageTop } from '../shell/PageTop';
import { useItems } from '../store/hooks';

function total(list: Item<'cost'>[]) {
  return list.reduce((sum, c) => sum + (c.data.amountPence ?? 0), 0);
}

export function Costs() {
  const costs = useItems('cost');
  const [edit, setEdit] = useState<CostEdit | null>(null);
  const sorted = [...(costs ?? [])].sort((a, b) => b.data.date.localeCompare(a.data.date));
  const spent = sorted.filter((c) => c.data.kind === 'expense');
  const lost = sorted.filter((c) => c.data.kind === 'income');

  const list = (entries: Item<'cost'>[], empty: string) =>
    entries.length === 0 ? (
      <p>{empty}</p>
    ) : (
      <ul className="entry-list">
        {entries.map((c) => (
          <li key={c.id} className="note-card">
            <h3 className="entry-title">
              {c.data.item}
              {c.data.amountPence !== null && <span className="amount"> {formatPence(c.data.amountPence)}</span>}
            </h3>
            <p className="entry-meta">
              {readableDate(c.data.date)}
              {c.data.dateTo && ` to ${readableDate(c.data.dateTo)}`}
              {c.data.evidence && ` · Proof: ${c.data.evidence}`}
            </p>
            {c.private && <p className="field-hint">Private</p>}
            <Button onPress={() => setEdit({ existing: c })}>Edit</Button>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Costs &amp; lost income</h1>
      <div className="button-row">
        <Button variant="primary" onPress={() => setEdit({ kind: 'expense' })}>
          Add money spent
        </Button>
        <Button variant="primary" onPress={() => setEdit({ kind: 'income' })}>
          Add income lost
        </Button>
      </div>

      {costs && costs.length > 0 && (
        <dl className="totals">
          <div>
            <dt>Money spent</dt>
            <dd>{formatPence(total(spent))}</dd>
          </div>
          <div>
            <dt>Income lost</dt>
            <dd>{formatPence(total(lost))}</dd>
          </div>
          <div>
            <dt>Together</dt>
            <dd>{formatPence(total(sorted))}</dd>
          </div>
        </dl>
      )}

      <h2>Money I spent</h2>
      {list(spent, 'Nothing added yet.')}
      <h2>Income I lost</h2>
      {list(lost, 'Nothing added yet.')}

      <FiledNotes section="costs" />
      <CostDialog edit={edit} onClose={() => setEdit(null)} />
    </>
  );
}
