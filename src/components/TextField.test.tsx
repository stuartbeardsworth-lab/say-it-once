import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { detectPhone, MicHelp } from './MicHelp';
import { TextArea, TextField } from './TextField';

describe.each([
  ['TextField', TextField],
  ['TextArea', TextArea],
] as const)('%s', (_name, Field) => {
  it('is labelled by its label and described by its hint', () => {
    render(<Field label="Organisation" hint="For example, the hospital." />);
    const input = screen.getByRole('textbox', { name: 'Organisation' });
    expect(input).toHaveAccessibleDescription('For example, the hospital.');
    expect(input).not.toBeInvalid();
  });

  it('adds the error message to the description and marks the field invalid', () => {
    render(<Field label="Organisation" hint="For example, the hospital." errorMessage="Enter the organisation." />);
    const input = screen.getByRole('textbox', { name: 'Organisation' });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(expect.stringContaining('Enter the organisation.'));
    expect(input).toHaveAccessibleDescription(expect.stringContaining('For example, the hospital.'));
    expect(screen.getByText('Enter the organisation.')).toBeVisible();
  });

  it('shows no error text when there is no error', () => {
    render(<Field label="Organisation" />);
    expect(screen.getByRole('textbox')).not.toHaveAccessibleDescription(expect.stringContaining('Enter'));
  });

  it('accepts typing', async () => {
    const user = userEvent.setup();
    render(<Field label="Organisation" />);
    const input = screen.getByRole('textbox', { name: 'Organisation' });
    await user.type(input, 'St Mary’s');
    expect(input).toHaveValue('St Mary’s');
  });
});

it('TextArea renders a multi-line box', () => {
  render(<TextArea label="What happened?" />);
  expect(screen.getByRole('textbox', { name: 'What happened?' }).tagName).toBe('TEXTAREA');
});

describe('microphone help', () => {
  it('is folded away, and opens to one short instruction and the steps for this phone only', async () => {
    const user = userEvent.setup();
    render(<MicHelp phone="iphone" />);
    const main = screen.getByText('Tap in the box, then tap the microphone on your keyboard.');
    expect(main).not.toBeVisible();
    await user.click(screen.getByText('Rather talk than type?'));
    expect(main).toBeVisible();
    expect(screen.getByText(/On an iPhone it’s at the bottom right/)).toBeVisible();
    // Turning it on, and other phones, stay folded until asked for.
    expect(screen.getByText(/turn on Dictation/)).not.toBeVisible();
    expect(screen.getByText(/On most Samsung phones/)).not.toBeVisible();
    await user.click(screen.getByText('Still can’t see it?'));
    expect(screen.getByText(/turn on Dictation/)).toBeVisible();
    await user.click(screen.getByText('Not an iPhone?'));
    expect(screen.getByText(/On most Samsung phones/)).toBeVisible();
    expect(screen.getByText(/On most Android phones/)).toBeVisible();
  });

  it('on a computer, gives the short instruction and every phone’s steps behind one fold', async () => {
    const user = userEvent.setup();
    render(<MicHelp phone="other" />);
    await user.click(screen.getByText('Rather talk than type?'));
    expect(screen.queryByText('Still can’t see it?')).not.toBeInTheDocument();
    await user.click(screen.getByText('Steps for each phone'));
    expect(screen.getByRole('heading', { name: 'iPhone or iPad' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Samsung phone' })).toBeVisible();
  });

  it('is only shown under a box when asked for', () => {
    const { rerender } = render(<TextArea label="Your note" />);
    expect(screen.queryByText('Rather talk than type?')).not.toBeInTheDocument();
    rerender(<TextArea label="Your note" micHelp />);
    expect(screen.getByText('Rather talk than type?')).toBeInTheDocument();
  });
});

describe('detectPhone', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15', 0, 'iphone'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5, 'iphone'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0, 'other'],
    ['Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) SamsungBrowser/26.0 Chrome/122', 5, 'samsung'],
    ['Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/128 Mobile', 5, 'android'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128', 0, 'other'],
  ] as const)('%s → %s', (ua, touch, phone) => {
    expect(detectPhone(ua, touch)).toBe(phone);
  });
});
