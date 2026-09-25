import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

function setup(onConfirm: () => void | Promise<void>) {
  const user = userEvent.setup();
  render(
    <ConfirmDialog
      trigger={<Button>Delete appointment</Button>}
      title="Delete this appointment?"
      confirmLabel="Delete appointment"
      pendingLabel="Deleting…"
      onConfirm={onConfirm}
    >
      <p>The appointment on 3 March will be deleted.</p>
    </ConfirmDialog>,
  );
  return { user, trigger: screen.getByRole('button', { name: 'Delete appointment' }) };
}

describe('ConfirmDialog', () => {
  it('opens as an alert dialog named by its heading, with focus on Cancel', async () => {
    const { user, trigger } = setup(vi.fn());
    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this appointment?' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('keeps focus inside while tabbing', async () => {
    const { user, trigger } = setup(vi.fn());
    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog');
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('cancels on Escape without deleting, and returns focus', async () => {
    const onConfirm = vi.fn();
    const { user, trigger } = setup(onConfirm);
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('does not delete when Enter is pressed straight away', async () => {
    const onConfirm = vi.fn();
    const { user, trigger } = setup(onConfirm);
    await user.click(trigger);
    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('runs the action and closes when confirmed', async () => {
    const onConfirm = vi.fn();
    const { user, trigger } = setup(onConfirm);
    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete appointment' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('stays open and says so when the action fails', async () => {
    const { user, trigger } = setup(() => Promise.reject(new Error('storage full')));
    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete appointment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("That didn’t work, so nothing has changed.");
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('clears an earlier failure message when opened again', async () => {
    const { user, trigger } = setup(() => Promise.reject(new Error('storage full')));
    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete appointment' }));
    await screen.findByRole('alert');
    await user.keyboard('{Escape}');
    await user.click(trigger);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
