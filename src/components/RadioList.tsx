import { Label, Radio, RadioGroup, Text } from 'react-aria-components';

// A labelled list of choices, one per row, each easy to tap. Arrow keys
// move between choices, as screen reader users expect.

export interface RadioListProps<V extends string> {
  label: string;
  hint?: string | undefined;
  options: readonly { value: V; label: string }[];
  value: V | null;
  onChange: (value: V) => void;
  errorMessage?: string | undefined;
}

export function RadioList<V extends string>({ label, hint, options, value, onChange, errorMessage }: RadioListProps<V>) {
  return (
    <RadioGroup
      className="choice-list"
      value={value}
      onChange={(v) => {
        const match = options.find((o) => o.value === v);
        if (match) onChange(match.value);
      }}
      isInvalid={Boolean(errorMessage)}
    >
      <Label className="field-label">{label}</Label>
      {hint && (
        <Text slot="description" className="field-hint">
          {hint}
        </Text>
      )}
      {errorMessage && (
        <Text slot="errorMessage" className="field-error">
          {errorMessage}
        </Text>
      )}
      {options.map((o) => (
        <Radio key={o.value} value={o.value} className="choice">
          {o.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}
