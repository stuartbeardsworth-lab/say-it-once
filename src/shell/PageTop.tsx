import { Button } from '../components/Button';
import { goBack, navigate } from '../router';

// Back and Home at the top of every screen except Home (docs/spec.md, Screens).
export function PageTop() {
  return (
    <nav aria-label="Back and Home" className="page-top">
      <Button variant="secondary" onPress={goBack}>
        Back
      </Button>
      <Button variant="secondary" onPress={() => navigate('home')}>
        Home
      </Button>
    </nav>
  );
}
