import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SaveStatus, type SaveState } from './SaveStatus';

describe('SaveStatus', () => {
  it('announces saving and saved politely', () => {
    const { rerender } = render(<SaveStatus status={{ kind: 'saving' }} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');
    rerender(<SaveStatus status={{ kind: 'saved' }} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('keeps its live regions in the page even when idle', () => {
    render(<SaveStatus status={{ kind: 'idle' }} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('announces a failure as an alert with what to do', () => {
    render(<SaveStatus status={{ kind: 'failed', message: 'This device is full.' }} onDismiss={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Not saved');
    expect(alert).toHaveTextContent('This device is full.');
    expect(screen.getByRole('status')).not.toHaveTextContent('Saved');
  });

  it('keeps a failure on screen until it is dismissed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    function Harness() {
      const [status, setStatus] = useState<SaveState>({ kind: 'failed', message: 'This device is full.' });
      return <SaveStatus status={status} onDismiss={() => setStatus({ kind: 'idle' })} />;
    }
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);
    vi.advanceTimersByTime(60_000);
    expect(screen.getByRole('alert')).toHaveTextContent('This device is full.');
    await user.click(screen.getByRole('button', { name: 'Dismiss this message' }));
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    vi.useRealTimers();
  });
});
