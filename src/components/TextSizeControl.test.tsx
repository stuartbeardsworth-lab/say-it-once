import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TextSizeProvider } from '../textSize';
import { TextSizeControl } from './TextSizeControl';

afterEach(() => {
  document.documentElement.style.fontSize = '';
});

describe('Text size', () => {
  it('starts at the browser’s own size', () => {
    render(
      <TextSizeProvider>
        <TextSizeControl />
      </TextSizeProvider>,
    );
    expect(document.documentElement.style.fontSize).toBe('100%');
  });

  it('scales the root font size straight away when a size is chosen', async () => {
    const user = userEvent.setup();
    render(
      <TextSizeProvider>
        <TextSizeControl />
      </TextSizeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Text size' }));
    const group = screen.getByRole('radiogroup', { name: 'Choose how big the words are' });
    expect(group).toHaveAccessibleDescription(expect.stringContaining('straight away'));
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Largest' }));
    expect(document.documentElement.style.fontSize).toBe('175%');

    await user.click(screen.getByRole('radio', { name: 'Large' }));
    expect(document.documentElement.style.fontSize).toBe('125%');
  });
});
