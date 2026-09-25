import { Button as AriaButton, Radio, RadioGroup, Text } from 'react-aria-components';
import { isTextSizeId, textSizes, useTextSize } from '../textSize';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { SaveStatus } from './SaveStatus';

// A quiet button in the header opens a small dialog with the four sizes
// side by side. Each choice shows a letter at roughly the size it gives, so
// the options explain themselves. Every target stays at least 44 by 44
// pixels, which is easy to tap with a shaky hand or a thumb.

export function TextSizeControl() {
  const { size, setSize, saveStatus, dismissSaveStatus } = useTextSize();
  return (
    <Dialog
      trigger={
        <AriaButton className="header-button">
          <span className="header-button-glyph" aria-hidden="true">
            Aa
          </span>
          Text size
        </AriaButton>
      }
      title="Text size"
    >
      {(close) => (
        <>
          <div className="size-options-wrap">
          <RadioGroup
            className="size-options"
            aria-label="Text size"
            value={size}
            onChange={(value) => {
              if (isTextSizeId(value)) setSize(value);
            }}
          >
            <Text slot="description" className="field-hint size-options-hint">
              The change happens straight away, everywhere in Say It Once.
            </Text>
            {textSizes.map((t) => (
              <Radio key={t.id} value={t.id} className="size-option">
                <span className={`size-option-sample size-option-sample-${t.id}`} aria-hidden="true">
                  A
                </span>
                <span className="size-option-label">{t.label}</span>
              </Radio>
            ))}
          </RadioGroup>
          </div>
          {saveStatus.kind === 'failed' && <SaveStatus status={saveStatus} onDismiss={dismissSaveStatus} />}
          <div className="dialog-actions">
            <Button variant="primary" onPress={close}>
              Done
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
