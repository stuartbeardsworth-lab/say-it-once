import { formatPence } from '../domain/money';
import { RouteLink, type Route } from '../router';
import { PageTop } from '../shell/PageTop';
import { useItems } from '../store/hooks';

// Keep track: the four lists, with how much is in each.

function countText(n: number | undefined, one: string, many: string) {
  if (n === undefined) return '…';
  if (n === 0) return 'Nothing yet';
  return `${n} ${n === 1 ? one : many}`;
}

function Card({ to, title, detail }: { to: Route; title: string; detail: string }) {
  return (
    <li className="track-card">
      <RouteLink to={to} className="track-link">
        <span className="track-title">{title}</span>
        <span className="track-detail">{detail}</span>
      </RouteLink>
    </li>
  );
}

export function Track() {
  const appointments = useItems('appointment');
  const treatments = useItems('treatment');
  const medications = useItems('medication');
  const documents = useItems('document');
  const costs = useItems('cost');
  const contacts = useItems('contact');

  const spent = (costs ?? []).filter((c) => c.data.kind === 'expense').reduce((sum, c) => sum + (c.data.amountPence ?? 0), 0);
  const lost = (costs ?? []).filter((c) => c.data.kind === 'income').reduce((sum, c) => sum + (c.data.amountPence ?? 0), 0);
  const treatmentCount =
    treatments && medications ? treatments.length + medications.length : undefined;

  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>Keep track</h1>
      <ul className="track-grid">
        <Card to="appointments" title="Appointments" detail={countText(appointments?.length, 'appointment', 'appointments')} />
        <Card to="treatment" title="Treatment & medication" detail={countText(treatmentCount, 'entry', 'entries')} />
        <Card to="documents" title="Letters & documents" detail={countText(documents?.length, 'document', 'documents')} />
        <Card
          to="costs"
          title="Costs & lost income"
          detail={costs && costs.length > 0 ? `${formatPence(spent)} spent · ${formatPence(lost)} lost` : countText(costs?.length, 'entry', 'entries')}
        />
        <Card
          to="contacts"
          title="Contacts & important numbers"
          detail={countText(contacts?.length, 'contact', 'contacts')}
        />
      </ul>
    </>
  );
}
