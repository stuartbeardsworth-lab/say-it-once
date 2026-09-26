import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { Store } from '../../store/store';
import { pageBlocks } from './speech';

describe('pageBlocks', () => {
  it('reads headings, text and labels in order, once each, and skips what is hidden or folded away', () => {
    document.body.innerHTML = `
      <main>
        <h1>Title</h1>
        <p>First <strong>line</strong>.</p>
        <ul><li><p>Inside a list</p></li></ul>
        <span aria-hidden="true"><p>Decoration</p></span>
        <details><summary>More</summary><p>Folded</p></details>
        <details open><summary>Open</summary><p>Shown</p></details>
        <label>A field</label>
      </main>`;
    const main = document.querySelector('main')!;
    // jsdom has no layout, so innerText falls back to textContent.
    expect(pageBlocks(main)).toEqual(['Title', 'First line.', 'Inside a list', 'More', 'Open', 'Shown', 'A field']);
  });
});

describe('Listen', () => {
  const spoken: string[] = [];
  let queue: SpeechSynthesisUtterance[] = [];

  beforeEach(() => {
    window.history.replaceState(null, '', '#home');
    spoken.length = 0;
    queue = [];
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        rate = 1;
        voice: unknown = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    vi.stubGlobal('speechSynthesis', {
      speak: vi.fn((u: SpeechSynthesisUtterance) => {
        spoken.push(u.text);
        queue.push(u);
      }),
      cancel: vi.fn(() => {
        queue = [];
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reads the page aloud, can pause and stop, and stops when moving to another screen', async () => {
    const user = userEvent.setup();
    render(<App store={new Store(`listen-${crypto.randomUUID()}`)} />);
    await screen.findByRole('heading', {
      level: 1,
      name: /Keep everything together/,
    });

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(spoken[0]).toBe('After an injury, accident or illness…');
    expect(spoken).toContain('Keep everything together, so you don’t have to start again.');
    expect(spoken).toContain('Add something');
    expect(spoken.every((t) => t.length > 0)).toBe(true);

    const bar = screen.getByRole('region', { name: 'Reading aloud' });
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(window.speechSynthesis.pause).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Carry on' }));
    expect(window.speechSynthesis.resume).toHaveBeenCalled();

    // The header button now stops it.
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Stop' }));
    expect(bar).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Listen' }));
    expect(screen.getByRole('region', { name: 'Reading aloud' })).toBeInTheDocument();
    const cancels = vi.mocked(window.speechSynthesis.cancel).mock.calls.length;
    await user.click(screen.getByRole('button', { name: /Find in my record/ }));
    await screen.findByRole('heading', { level: 1, name: 'Find in my record' });
    expect(vi.mocked(window.speechSynthesis.cancel).mock.calls.length).toBeGreaterThan(cancels);
    expect(screen.queryByRole('region', { name: 'Reading aloud' })).not.toBeInTheDocument();
  });

  it('finishes quietly when the last part has been read', async () => {
    const user = userEvent.setup();
    render(<App store={new Store(`listen-${crypto.randomUUID()}`)} />);
    await screen.findByRole('heading', {
      level: 1,
      name: /Keep everything together/,
    });
    await user.click(screen.getByRole('button', { name: 'Listen' }));
    const last = queue.at(-1)!;
    act(() => last.onend?.(new Event('end') as SpeechSynthesisEvent));
    expect(screen.queryByRole('region', { name: 'Reading aloud' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listen' })).toBeInTheDocument();
  });
});
