import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { TextSizeControl } from '../components/TextSizeControl';
import { RouteLink, routes, type Location } from '../router';
import { StorageBanner } from './StorageBanner';

interface AppShellProps {
  location: Location;
  children: ReactNode;
}

export function AppShell({ location, children }: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

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
            Say It Once
          </RouteLink>
          <TextSizeControl />
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="container main">
        <StorageBanner />
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <nav aria-label="More">
            <ul className="footer-links">
              <li>
                <RouteLink to="privacy">Privacy &amp; backup</RouteLink>
              </li>
              <li>
                <RouteLink to="building-blocks">Building blocks (for review)</RouteLink>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
