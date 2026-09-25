import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Store } from '../store/store';
import { StoreProvider } from '../store/StoreContext';
import { TextSizeProvider } from '../textSize';
import { TextSizeControl } from './TextSizeControl';

afterEach(() => {
  document.documentElement.style.fontSize = '';
});

function renderControl(store = new Store(`text-size-${crypto.randomUUID()}`)) {
  render(
    <StoreProvider store={store}>
      <TextSizeProvider>
        <TextSizeControl />
      </TextSizeProvider>
    </StoreProvider>,
  );
  return store;
}

describe('Text size', () => {
  it('starts at the browser’s own size', () => {
    renderControl();
    expect(document.documentElement.style.fontSize).toBe('100%');
  });

  it('scales the root font size straight away when a size is chosen', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button', { name: 'Text size' }));
    const group = screen.getByRole('radiogroup', { name: 'Text size' });
    expect(group).toHaveAccessibleDescription(expect.stringContaining('straight away'));
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Largest' }));
    expect(document.documentElement.style.fontSize).toBe('175%');

    await user.click(screen.getByRole('radio', { name: 'Large' }));
    expect(document.documentElement.style.fontSize).toBe('125%');
  });

  it('remembers the choice on this device', async () => {
    const user = userEvent.setup();
    const store = renderControl();
    await user.click(screen.getByRole('button', { name: 'Text size' }));
    await user.click(screen.getByRole('radio', { name: 'Larger' }));
    await waitFor(async () => expect(await store.getPreference('textSize')).toBe('larger'));
  });

  it('uses the size remembered last time', async () => {
    const store = new Store(`text-size-${crypto.randomUUID()}`);
    await store.open();
    await store.setPreference('textSize', 'largest');
    renderControl(store);
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe('175%'));
  });

  it('says so if the choice could not be remembered', async () => {
    const user = userEvent.setup();
    const store = renderControl();
    await user.click(screen.getByRole('button', { name: 'Text size' }));
    // Wait until start-up has finished writing, so the pretend failure hits
    // the text size save and not the start-up.
    await waitFor(async () => expect(await store.findRecord()).not.toBeNull());
    await store.queue.settled();
    store.queue.simulateNextFailure('full');
    await user.click(screen.getByRole('radio', { name: 'Largest' }));
    expect(await screen.findByText(/run out of space/)).toBeInTheDocument();
    // The page still changed size, as asked.
    expect(document.documentElement.style.fontSize).toBe('175%');
  });
});
