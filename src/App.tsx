import { useLocation } from './router';
import { AppShell } from './shell/AppShell';
import { AddToPhone } from './screens/AddToPhone';
import { Appointments } from './screens/Appointments';
import { BuildingBlocks } from './screens/BuildingBlocks';
import { Changes } from './screens/Changes';
import { Contacts } from './screens/Contacts';
import { Costs } from './screens/Costs';
import { Documents } from './screens/Documents';
import { Faq } from './screens/Faq';
import { Find } from './screens/Find';
import { HowToUse } from './screens/HowToUse';
import { Impact } from './screens/Impact';
import { Track } from './screens/Track';
import { Treatment } from './screens/Treatment';
import { Home } from './screens/Home';
import { NotFound } from './screens/NotFound';
import { Privacy } from './screens/Privacy';
import { QuickNotes } from './screens/QuickNotes';
import { Records } from './screens/Records';
import { Support } from './screens/Support';
import { UseRecord } from './screens/UseRecord';
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
    case 'impact':
      return <Impact />;
    case 'changes':
      return <Changes />;
    case 'track':
      return <Track />;
    case 'appointments':
      return <Appointments />;
    case 'treatment':
      return <Treatment />;
    case 'costs':
      return <Costs />;
    case 'documents':
      return <Documents />;
    case 'contacts':
      return <Contacts />;
    case 'quick-notes':
      return <QuickNotes />;
    case 'find':
      return <Find />;
    case 'use':
      return <UseRecord />;
    case 'support':
      return <Support />;
    case 'faq':
      return <Faq />;
    case 'how-to-use':
      return <HowToUse />;
    case 'add-to-phone':
      return <AddToPhone />;
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
