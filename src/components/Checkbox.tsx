import { useId } from 'react';

// A real checkbox with a label you can tap, and an optional hint read by
// screen readers. Used for "Keep this private" on every entry that has it.

export interface CheckboxProps {
  label: string;
  hint?: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}

export function Checkbox({ label, hint, isSelected, onChange }: CheckboxProps) {
  const id = useId();
  return (
    <div className="checkbox-field">
      <input
        id={id}
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <div>
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** The private control used on every entry that has one (decision Q13). */
export function KeepPrivate({ isSelected, onChange }: Pick<CheckboxProps, 'isSelected' | 'onChange'>) {
  return (
    <Checkbox
      label="Keep this private"
      hint="It stays in your record but is never included in anything you create to share."
      isSelected={isSelected}
      onChange={onChange}
    />
  );
}
