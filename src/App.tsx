import { useLocation } from './router';
import { AppShell } from './shell/AppShell';
import { BuildingBlocks } from './screens/BuildingBlocks';
import { Home } from './screens/Home';
import { NotFound } from './screens/NotFound';
import { Privacy } from './screens/Privacy';
import { QuickNotes } from './screens/QuickNotes';
import { Records } from './screens/Records';
import { WhatHappened } from './screens/WhatHappened';
import { StoreProvider } from './store/StoreContext';
import { Store } from './store/store';
import { TextSizeProvider } from './textSize';

function Screen({ location }: { location: ReturnType<typeof useLocation> }) {
  switch (location) {
    case 'home':
      return <Home />;
    case 'what':
      return <WhatHappened />;
    case 'quick-notes':
      return <QuickNotes />;
    case 'records':
      return <Records />;
    case 'privacy':
      return <Privacy />;
    case 'building-blocks':
      return <BuildingBlocks />;
    case 'not-found':
      return <NotFound />;
  }
}

const defaultStore = new Store();

export function App({ store = defaultStore }: { store?: Store }) {
  const location = useLocation();
  return (
    <StoreProvider store={store}>
      <TextSizeProvider>
        <AppShell location={location}>
          <Screen location={location} />
        </AppShell>
      </TextSizeProvider>
    </StoreProvider>
  );
}
