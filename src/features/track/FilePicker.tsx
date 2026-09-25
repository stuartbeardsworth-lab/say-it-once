import { useId } from 'react';
import { Button } from '../../components/Button';
import { maxFileBytes } from '../../store/store';

// Choose a file (or take a photo) to attach. The real file input stays in
// the page for keyboard and screen reader users; its label looks like a button.

interface FilePickerProps {
  label: string;
  /** The button's words when nothing is attached yet. */
  buttonLabel?: string;
  hint: string;
  accept: string;
  capture?: boolean;
  current: string | null;
  onPick: (file: File) => void;
  onRemove?: () => void;
  onTooLarge: () => void;
}

export function FilePicker({ label, buttonLabel = 'Choose a file', hint, accept, capture, current, onPick, onRemove, onTooLarge }: FilePickerProps) {
  const id = useId();
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {current && (
        <p>
          Attached: <strong>{current}</strong>
        </p>
      )}
      <div className="button-row">
        <label htmlFor={id} className="button button-secondary file-button">
          {current ? 'Replace it' : buttonLabel}
        </label>
        <input
          id={id}
          type="file"
          accept={accept}
          {...(capture && { capture: 'environment' })}
          className="visually-hidden-input"
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (file.size > maxFileBytes) onTooLarge();
            else onPick(file);
          }}
        />
        {current && onRemove && <Button onPress={onRemove}>Remove it</Button>}
      </div>
      <span id={`${id}-hint`} className="field-hint">
        {hint}
      </span>
    </div>
  );
}
