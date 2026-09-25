import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveStatus } from '../components/SaveStatus';
import { TextArea } from '../components/TextField';
import { StorageProblem } from '../store/problems';
import { useAutosave } from './useAutosave';

function Form({ save }: { save: (value: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const autosave = useAutosave(text, save);
  return (
    <>
      <TextArea label="What happened?" value={text} onChange={setText} onBlur={() => void autosave.flush()} />
      <button type="button">Elsewhere</button>
      <SaveStatus status={autosave.status} onDismiss={autosave.dismiss} />
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(save = vi.fn(() => Promise.resolve())) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Form save={save} />);
  return { user, save, box: screen.getByRole('textbox', { name: 'What happened?' }) };
}

describe('useAutosave', () => {
  it('waits until typing stops, then saves once with the latest text', async () => {
    const { user, save, box } = setup();
    await user.type(box, 'I fell');
    expect(save).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('I fell');
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('saves at once when the person leaves the field', async () => {
    const { user, save, box } = setup();
    await user.type(box, 'on the stairs');
    await user.tab();
    expect(save).toHaveBeenCalledWith('on the stairs');
  });

  it('saves at once when the page is hidden', async () => {
    const { user, save, box } = setup();
    await user.type(box, 'going to hospital');
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(save).toHaveBeenCalledWith('going to hospital');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('keeps the text and says why when a save fails', async () => {
    const save = vi.fn(() => Promise.reject(new StorageProblem('full')));
    const { user, box } = setup(save);
    await user.type(box, 'my words');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent('Not saved');
    expect(screen.getByRole('alert')).toHaveTextContent('run out of space');
    expect(box).toHaveValue('my words');
    expect(screen.getByRole('status')).not.toHaveTextContent('Saved');
  });

  it('shows "Saved" once a later save of the same words works', async () => {
    const save = vi.fn().mockRejectedValueOnce(new StorageProblem('full')).mockResolvedValue(undefined);
    const { user, box } = setup(save);
    await user.type(box, 'first');
    await user.tab();
    await screen.findByText('Not saved');
    await user.type(box, ' try');
    await user.tab();
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });
});
