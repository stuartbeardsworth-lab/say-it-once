import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Logo } from '../components/Logo';
import { TextSizeControl } from '../components/TextSizeControl';
import { RouteLink, routes, type Location } from '../router';
import { appVersion } from '../buildInfo';
import { ListenBar, ListenButton, useListen } from './ListenControl';
import { StorageBanner } from './StorageBanner';
import { UpdateNotice } from './UpdateNotice';

interface AppShellProps {
  location: Location;
  children: ReactNode;
}

export function AppShell({ location, children }: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const listen = useListen(location, () => mainRef.current);

  // After every navigation, move focus to the new page's heading so screen
  // reader users hear where they are and keyboard users start from the top.
  // On first load focus stays at the top of the page, so the skip link is
  // the first thing Tab reaches.
  useEffect(() => {
    document.title =
      location === 'not-found' ? 'Page not found – Say It Once' : `${routes[location].title} – Say It Once`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [location]);

  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    // The URL hash is used for screens, so the skip link moves focus itself
    // instead of changing the address.
    event.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <>
      <a href="#main" className="skip-link" onClick={skipToContent}>
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container site-header-inner">
          <RouteLink to="home" className="site-name">
            <Logo className="brand-mark" />
            <span className="brand-text">
              Say It Once
              <span className="brand-tagline">No need to relive it.</span>
            </span>
          </RouteLink>
          <div className="header-tools">
            <TextSizeControl />
            <ListenButton listen={listen} />
          </div>
        </div>
      </header>
      <ListenBar listen={listen} />
      <main id="main" ref={mainRef} tabIndex={-1} className="container main">
        <StorageBanner />
        <UpdateNotice />
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <p className="brand-promise">
            Record it <span aria-hidden="true">→</span> <span className="brand-keep">Keep it together</span>{' '}
            <span aria-hidden="true">→</span> Use it when you need it
          </p>
          <p className="field-hint">Say It Once, test version {appVersion}</p>
        </div>
      </footer>
    </>
  );
}
