import { useState } from 'react';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Dialog } from '../../components/Dialog';
import type { Candidate } from '../../reports/selection';

// "Choose entries": tick exactly which entries go into one section. The
// list comes from the shareable view, so nothing private is ever offered.

interface ChooseEntriesDialogProps {
  title: string | null;
  candidates: Candidate[];
  chosen: string[];
  onClose: () => void;
  onChoose: (ids: string[]) => void;
}

export function ChooseEntriesDialog({ title, candidates, chosen, onClose, onChoose }: ChooseEntriesDialogProps) {
  return (
    <Dialog
      isOpen={title !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Choose entries: ${title ?? ''}`}
    >
      {(close) => <Chooser candidates={candidates} chosen={chosen} onCancel={close} onChoose={onChoose} />}
    </Dialog>
  );
}

function Chooser({
  candidates,
  chosen,
  onCancel,
  onChoose,
}: {
  candidates: Candidate[];
  chosen: string[];
  onCancel: () => void;
  onChoose: (ids: string[]) => void;
}) {
  const [ticked, setTicked] = useState(() => new Set(chosen));
  const sorted = [...candidates].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  return (
    <>
      <p>
        {ticked.size} of {candidates.length} chosen. Newest first.
      </p>
      <div className="button-row">
        <Button onPress={() => setTicked(new Set(candidates.map((c) => c.id)))}>Choose all</Button>
        <Button onPress={() => setTicked(new Set())}>Choose none</Button>
      </div>
      <div className="entry-choices">
        {sorted.map((c) => (
          <Checkbox
            key={c.id}
            label={c.label}
            isSelected={ticked.has(c.id)}
            onChange={(on) =>
              setTicked((t) => {
                const next = new Set(t);
                if (on) next.add(c.id);
                else next.delete(c.id);
                return next;
              })
            }
          />
        ))}
      </div>
      <div className="dialog-actions">
        <Button onPress={onCancel}>Cancel</Button>
        <Button variant="primary" onPress={() => onChoose(candidates.map((c) => c.id).filter((id) => ticked.has(id)))}>
          Use these
        </Button>
      </div>
    </>
  );
}
