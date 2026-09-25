import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { parseHash } from './router';

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
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep everything together');
    expect(document.title).toBe('Home – Say It Once');
  });

  it('shows the device-only warning on Home and Privacy & backup', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('complementary', { name: 'Where your record is kept' })).toHaveTextContent(
      'If the phone or browser data is lost, so is your record.',
    );
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    expect(screen.getByRole('complementary', { name: 'Where your record is kept' })).toBeInTheDocument();
  });

  it('moves focus to the page heading after navigating', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    const heading = screen.getByRole('heading', { level: 1, name: 'Privacy & backup' });
    expect(heading).toHaveFocus();
    expect(window.location.hash).toBe('#privacy');
    expect(document.title).toBe('Privacy & backup – Say It Once');
  });

  it('Back returns to the previous screen and focuses its heading', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Privacy & backup' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    // history.back() is asynchronous in jsdom.
    await screen.findByRole('heading', { level: 1, name: /Keep everything together/ });
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('Back goes Home when the person arrived directly', async () => {
    window.history.replaceState(null, '', '/#privacy');
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep everything together');
  });

  it('the skip link moves focus to the main content without changing screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('shows a calm not-found page for unknown addresses', () => {
    window.history.replaceState(null, '', '/#nowhere');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
  });

  it('follows the address when it is changed outside the app', () => {
    render(<App />);
    act(() => {
      window.location.hash = '#privacy';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy & backup');
  });
});
