import { MicHelp } from './MicHelp';
import {
  FieldError,
  Input,
  Label,
  Text,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';

// Label, hint and error are all linked to the input, so a screen reader
// reads them together: "Organisation, edit text, For example the hospital
// or GP surgery". The error is added to that description and the field is
// marked invalid, so it is heard as well as seen. As on GOV.UK forms, the
// error sits between the hint and the box, where the eye is already going.

export interface TextFieldProps
  extends Omit<AriaTextFieldProps, 'className' | 'children' | 'isInvalid' | 'validationBehavior'> {
  label: string;
  /** Short help shown under the label. */
  hint?: string | undefined;
  /** When set, the field is shown as having a problem with this message. */
  errorMessage?: string | undefined;
  /** The id of a <datalist> of suggestions. */
  list?: string;
}

function fieldParts({ label, hint, errorMessage }: Pick<TextFieldProps, 'label' | 'hint' | 'errorMessage'>) {
  return {
    label: <Label className="field-label">{label}</Label>,
    hint: hint ? (
      <Text slot="description" className="field-hint">
        {hint}
      </Text>
    ) : null,
    error: <FieldError className="field-error">{errorMessage}</FieldError>,
  };
}

export function TextField({ label, hint, errorMessage, list, ...props }: TextFieldProps) {
  const parts = fieldParts({ label, hint, errorMessage });
  return (
    <AriaTextField {...props} className="field" isInvalid={Boolean(errorMessage)} validationBehavior="aria">
      {parts.label}
      {parts.hint}
      {parts.error}
      <Input className="field-input" {...(list && { list })} />
    </AriaTextField>
  );
}

export interface TextAreaProps extends Omit<TextFieldProps, 'list'> {
  rows?: number;
  /** Shows "Rather talk than type?" under the box. Use once per screen or dialog, on its main box. */
  micHelp?: boolean;
}

export function TextArea({ label, hint, errorMessage, rows = 5, micHelp = false, ...props }: TextAreaProps) {
  const parts = fieldParts({ label, hint, errorMessage });
  return (
    <>
      <AriaTextField {...props} className="field" isInvalid={Boolean(errorMessage)} validationBehavior="aria">
        {parts.label}
        {parts.hint}
        {parts.error}
        <AriaTextArea className="field-input field-textarea" rows={rows} />
      </AriaTextField>
      {micHelp && <MicHelp />}
    </>
  );
}
