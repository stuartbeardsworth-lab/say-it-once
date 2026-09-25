import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { TextField } from './TextField';

function Example() {
  return (
    <>
      <button type="button">Before</button>
      <Dialog trigger={<Button>Open</Button>} title="Example dialog">
        {(close) => (
          <>
            <TextField label="Your name" />
            <Button onPress={close}>Done</Button>
          </>
        )}
      </Dialog>
      <button type="button">After</button>
    </>
  );
}

async function openDialog() {
  const user = userEvent.setup();
  render(<Example />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  await user.click(trigger);
  return { user, trigger, dialog: screen.getByRole('dialog', { name: 'Example dialog' }) };
}

describe('Dialog', () => {
  it('is labelled by its heading', async () => {
    const { dialog } = await openDialog();
    expect(dialog).toHaveAccessibleName('Example dialog');
  });

  it('moves focus into the dialog when it opens', async () => {
    const { dialog } = await openDialog();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('keeps focus inside while tabbing forwards and backwards', async () => {
    const { user, dialog } = await openDialog();
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Escape and returns focus to the button that opened it', async () => {
    const { user, trigger } = await openDialog();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('returns focus to the opener when closed with its own button', async () => {
    const { user, trigger } = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('Dialog with unsaved changes', () => {
  function Unsaved() {
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onPress={() => setOpen(true)}>Write</Button>
        <Dialog isOpen={open} onOpenChange={setOpen} title="Note" hasUnsavedChanges={text !== ''} unsavedLabel="this note">
          {(close, { finish }) => (
            <>
              <TextField label="Note" value={text} onChange={setText} />
              <Button onPress={close}>Cancel</Button>
              <Button onPress={finish}>Save</Button>
            </>
          )}
        </Dialog>
      </>
    );
  }

  async function openAndType() {
    const user = userEvent.setup();
    render(<Unsaved />);
    await user.click(screen.getByRole('button', { name: 'Write' }));
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'my words');
    return user;
  }

  it('asks before Escape throws words away, and Keep editing keeps them', async () => {
    const user = await openAndType();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This hasn’t been saved');
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('my words');
  });

  it('asks before Cancel throws words away, and Discard closes', async () => {
    const user = await openAndType();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Discard this note' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes straight away after saving', async () => {
    const user = await openAndType();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes straight away when nothing was typed', async () => {
    const user = userEvent.setup();
    render(<Unsaved />);
    await user.click(screen.getByRole('button', { name: 'Write' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
