import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { parseHash } from './router';
import { StorageProblem } from './store/problems';
import { Store } from './store/store';

function renderApp() {
  return render(<App store={new Store(`app-${crypto.randomUUID()}`)} />);
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('parseHash', () => {
  it.each([
    ['', 'home'],
    ['#', 'home'],
    ['#home', 'home'],
    ['#privacy', 'privacy'],
    ['#/privacy', 'privacy'],
    ['#building-blocks', 'building-blocks'],
    ['#nowhere', 'not-found'],
    ['#toString', 'not-found'],
  ])('%s → %s', (hash, expected) => {
    expect(parseHash(hash)).toBe(expected);
  });
});

describe('App shell', () => {
  it('opens on Home', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep everything together');
    expect(document.title).toBe('Home – Say It Once');
  });

  it('shows the device-only warning on Home and Privacy & backup', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByRole('complementary', { name: 'Where your record is kept' })).toHaveTextContent(
      'If the phone or browser data is lost, so is your record.',
    );
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    expect(screen.getByRole('complementary', { name: 'Where your record is kept' })).toBeInTheDocument();
  });

  it('moves focus to the page heading after navigating', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    const heading = screen.getByRole('heading', { level: 1, name: 'Privacy & backup' });
    expect(heading).toHaveFocus();
    expect(window.location.hash).toBe('#privacy');
    expect(document.title).toBe('Privacy & backup – Say It Once');
  });

  it('Back returns to the previous screen and focuses its heading', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    // history.back() is asynchronous in jsdom.
    await screen.findByRole('heading', { level: 1, name: /Keep everything together/ });
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('Back goes Home when the person arrived directly', async () => {
    window.history.replaceState(null, '', '/#privacy');
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep everything together');
  });

  it('the skip link moves focus to the main content without changing screen', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('shows a calm not-found page for unknown addresses', () => {
    window.history.replaceState(null, '', '/#nowhere');
    renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
  });

  it('follows the address when it is changed outside the app', () => {
    renderApp();
    act(() => {
      window.location.hash = '#privacy';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy & backup');
  });
});

describe('storage', () => {
  it('creates "My record" quietly on first open', async () => {
    const store = new Store(`app-${crypto.randomUUID()}`);
    render(<App store={store} />);
    await waitFor(async () => expect(await store.findRecord()).not.toBeNull());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a clear message on every screen when nothing can be saved, and can try again', async () => {
    const store = new Store(`app-${crypto.randomUUID()}`);
    vi.spyOn(store, 'open').mockResolvedValueOnce({ ok: false, problem: new StorageProblem('blocked') });
    const user = userEvent.setup();
    render(<App store={store} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('can’t save on this device');
    expect(alert).toHaveTextContent('private window');
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    // Privacy & backup also has empty alert areas, ready for backup messages.
    const storageAlert = () => screen.queryAllByRole('alert').filter((a) => a.textContent?.includes('can’t save on this device'));
    expect(storageAlert()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(storageAlert()).toHaveLength(0));
  });
});
