import { Button } from '../components/Button';
import { goBack, navigate, RouteLink } from '../router';
import { useRecordName, useRecords } from '../store/hooks';

// Back and Home at the top of every screen except Home, and the record's
// name when there is more than one (docs/spec.md, Screens).
export function PageTop() {
  const records = useRecords();
  const name = useRecordName();
  return (
    <div className="page-top-wrap">
      <nav aria-label="Back and Home" className="page-top">
        <Button variant="secondary" onPress={goBack}>
          Back
        </Button>
        <Button variant="secondary" onPress={() => navigate('home')}>
          Home
        </Button>
      </nav>
      {records && records.length > 1 && name && (
        <p className="record-tag">
          Record: <strong>{name}</strong> · <RouteLink to="records">Change</RouteLink>
        </p>
      )}
    </div>
  );
}
