import { useLocation } from './router';
import { AppShell } from './shell/AppShell';
import { BuildingBlocks } from './screens/BuildingBlocks';
import { Home } from './screens/Home';
import { NotFound } from './screens/NotFound';
import { Privacy } from './screens/Privacy';
import { TextSizeProvider } from './textSize';

function Screen({ location }: { location: ReturnType<typeof useLocation> }) {
  switch (location) {
    case 'home':
      return <Home />;
    case 'privacy':
      return <Privacy />;
    case 'building-blocks':
      return <BuildingBlocks />;
    case 'not-found':
      return <NotFound />;
  }
}

export function App() {
  const location = useLocation();
  return (
    <TextSizeProvider>
      <AppShell location={location}>
        <Screen location={location} />
      </AppShell>
    </TextSizeProvider>
  );
}
