import { useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';

// A small hash router. Screens are addressed as #home, #privacy and so on,
// as in the old app. Hash URLs need no server configuration and keep working
// offline and from a home-screen icon.

export const routes = {
  home: { title: 'Home' },
  what: { title: 'What happened' },
  impact: { title: 'How it affects me' },
  changes: { title: 'Changes over time' },
  track: { title: 'Keep track' },
  appointments: { title: 'Appointments' },
  treatment: { title: 'Treatment & medication' },
  costs: { title: 'Costs & lost income' },
  documents: { title: 'Letters & documents' },
  contacts: { title: 'Contacts & important numbers' },
  'quick-notes': { title: 'Quick Notes' },
  find: { title: 'Find in my record' },
  use: { title: 'Use my record' },
  support: { title: 'Find support' },
  help: { title: 'Help' },
  // Older addresses, kept so saved links still work; both open Help.
  faq: { title: 'Help' },
  'how-to-use': { title: 'Help' },
  'add-to-phone': { title: 'Keep Say It Once on your phone' },
  records: { title: 'My records' },
  privacy: { title: 'Privacy & backup' },
  'building-blocks': { title: 'Building blocks' },
} as const;

export type Route = keyof typeof routes;
export type Location = Route | 'not-found';

function isRoute(value: string): value is Route {
  return Object.hasOwn(routes, value);
}

export function parseHash(hash: string): Location {
  const name = hash.replace(/^#\/?/, '');
  if (name === '') return 'home';
  return isRoute(name) ? name : 'not-found';
}

// How many screens deep the person has gone inside the app in this tab.
// Stored in the history entry, so it stays right when they use the
// browser's own Back and Forward buttons.
function depth(): number {
  const state: unknown = window.history.state;
  if (typeof state === 'object' && state !== null && 'sioDepth' in state) {
    return typeof state.sioDepth === 'number' ? state.sioDepth : 0;
  }
  return 0;
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener('hashchange', listener);
  };
}

export function useLocation(): Location {
  return useSyncExternalStore(subscribe, () => parseHash(window.location.hash));
}

export function navigate(route: Route) {
  window.history.pushState({ sioDepth: depth() + 1 }, '', `#${route}`);
  notify();
}

// Back goes to the previous screen in the app, or Home if the person
// arrived here directly (for example from a bookmark).
export function goBack() {
  if (depth() > 0) window.history.back();
  else navigate('home');
}

interface RouteLinkProps {
  to: Route;
  className?: string;
  children: ReactNode;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export function RouteLink({ to, className, children, ...aria }: RouteLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Let the browser handle "open in new tab" and similar.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }
  return (
    <a href={`#${to}`} className={className} onClick={handleClick} {...aria}>
      {children}
    </a>
  );
}
