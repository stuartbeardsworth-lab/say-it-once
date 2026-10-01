import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { anyFilled, enoughToSave, MoreDetail } from './MoreDetail';

const summary = 'Add more detail (only if it helps)';

describe('MoreDetail', () => {
  it('says the fields so far are enough, and starts folded for a new entry', () => {
    render(
      <MoreDetail>
        <label>
          Dose <input />
        </label>
      </MoreDetail>,
    );
    expect(screen.getByText(enoughToSave)).toBeInTheDocument();
    expect(screen.getByText(summary).closest('details')).not.toHaveAttribute('open');
  });

  it('starts open when the entry already has something in it, so nothing is hidden', () => {
    render(
      <MoreDetail hasContent>
        <p>Dose</p>
      </MoreDetail>,
    );
    expect(screen.getByText(summary).closest('details')).toHaveAttribute('open');
  });

  it('never folds away while the person is typing', () => {
    const { rerender } = render(
      <MoreDetail hasContent>
        <p>Dose</p>
      </MoreDetail>,
    );
    rerender(
      <MoreDetail hasContent={false}>
        <p>Dose</p>
      </MoreDetail>,
    );
    expect(screen.getByText(summary).closest('details')).toHaveAttribute('open');
  });

  it('can say something else above the fold-out', () => {
    render(
      <MoreDetail note="That’s enough.">
        <p>Dose</p>
      </MoreDetail>,
    );
    expect(screen.getByText('That’s enough.')).toBeInTheDocument();
  });
});

describe('anyFilled', () => {
  it('counts text, choices, links and ticks, but not blanks', () => {
    expect(anyFilled('', '  ', null, undefined, false)).toBe(false);
    expect(anyFilled('', 'Hospital')).toBe(true);
    expect(anyFilled(null, { section: 'costs', itemId: null })).toBe(true);
    expect(anyFilled(true)).toBe(true);
  });
});
