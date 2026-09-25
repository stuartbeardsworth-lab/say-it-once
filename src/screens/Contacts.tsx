import { useState } from 'react';
import { Button } from '../components/Button';
import { contactCard, isEmail, safeFileName } from '../domain/exports';
import type { Item } from '../domain/types';
import { FiledNotes } from '../features/quickNotes/FiledNotes';
import { ContactDialog } from '../features/track/ContactDialog';
import { deliverFile, deliveryMessage } from '../forms/deliverFile';
import { PageTop } from '../shell/PageTop';
import { useItems, useRecordName } from '../store/hooks';

function name(c: Item<'contact'>) {
  return c.data.organisation || c.data.phoneOrEmail;
}

function ContactLink({ value }: { value: string }) {
  const v = value.trim();
  if (!v) return null;
  if (isEmail(v)) return <a href={`mailto:${v}`}>{v}</a>;
  if (/^[+\d][\d\s()-]{5,}$/.test(v)) return <a href={`tel:${v.replace(/[\s()-]/g, '')}`}>{v}</a>;
  return <span>{v}</span>;
}

export function Contacts() {
  const contacts = useItems('contact');
  const recordName = useRecordName();
  const [edit, setEdit] = useState<{ existing?: Item<'contact'> } | null>(null);
  const [message, setMessage] = useState('');
  const sorted = [...(contacts ?? [])].sort((a, b) => name(a).localeCompare(name(b)));
  // Private contacts are never printed (CLAUDE.md, "Decisions made during the build").
  const printable = sorted.filter((c) => !c.private);

  async function addToContacts(c: Item<'contact'>) {
    const fileName = safeFileName(name(c), 'vcf');
    const result = await deliverFile(contactCard(c.data), fileName, 'text/vcard');
    setMessage(deliveryMessage(result, fileName, 'Open it to add them to your contacts.'));
  }

  function printList() {
    document.body.dataset.print = 'contacts';
    const done = () => {
      delete document.body.dataset.print;
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Contacts &amp; important numbers</h1>
      <div className="button-row">
        <Button variant="primary" onPress={() => setEdit({})}>
          Add a contact
        </Button>
        {printable.length > 0 && <Button onPress={printList}>Print the contact list</Button>}
      </div>
      <p role="status" className="quiet-status">
        {message}
      </p>
      {contacts === undefined ? (
        <p>Loading…</p>
      ) : sorted.length === 0 ? (
        <p>No contacts yet.</p>
      ) : (
        <ul className="entry-list">
          {sorted.map((c) => (
            <li key={c.id} className="note-card">
              <h2 className="entry-title">{name(c)}</h2>
              <p className="entry-meta">
                {[c.data.role, c.data.reference && `Reference: ${c.data.reference}`].filter(Boolean).join(' · ')}
              </p>
              <p>
                <ContactLink value={c.data.phoneOrEmail} />
              </p>
              {c.private && <p className="field-hint">Private. Not included when printing or adding to your contacts.</p>}
              <div className="button-row">
                <Button onPress={() => setEdit({ existing: c })}>Edit</Button>
                {!c.private && <Button onPress={() => void addToContacts(c)}>Add to my contacts</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FiledNotes section="contacts" />

      <section className="print-contacts" aria-hidden="true">
        <h1>Contacts{recordName ? ` — ${recordName}` : ''}</h1>
        <table>
          <thead>
            <tr>
              <th>Name or organisation</th>
              <th>Role</th>
              <th>Phone or email</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {printable.map((c) => (
              <tr key={c.id}>
                <td>{name(c)}</td>
                <td>{c.data.role}</td>
                <td>{c.data.phoneOrEmail}</td>
                <td>{c.data.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ContactDialog edit={edit} onClose={() => setEdit(null)} />
    </>
  );
}
