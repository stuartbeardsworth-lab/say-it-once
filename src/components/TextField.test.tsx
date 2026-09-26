import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
  it('is folded away under the box, and opens to show the steps for each kind of phone', async () => {
    const user = userEvent.setup();
    render(<TextArea label="Your note" micHelp />);
    const summary = screen.getByText('Can’t find the microphone?');
    expect(screen.getByRole('heading', { name: 'iPhone or iPad', hidden: true })).not.toBeVisible();
    await user.click(summary);
    expect(screen.getByRole('heading', { name: 'iPhone or iPad' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Samsung phone' })).toBeVisible();
    expect(screen.getByText(/Say It Once never receives the recording/)).toBeVisible();
  });

  it('is only shown when asked for', () => {
    render(<TextArea label="Your note" />);
    expect(screen.queryByText('Can’t find the microphone?')).not.toBeInTheDocument();
  });
});
