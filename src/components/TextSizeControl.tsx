import { Label, Radio, RadioGroup, Text } from 'react-aria-components';
import { textSizes, useTextSize, type TextSizeId } from '../textSize';
import { Button } from './Button';
import { Dialog } from './Dialog';

function isTextSizeId(value: string): value is TextSizeId {
  return textSizes.some((t) => t.id === value);
}

export function TextSizeControl() {
  const { size, setSize } = useTextSize();
  return (
    <Dialog trigger={<Button variant="secondary">Text size</Button>} title="Text size">
      {(close) => (
        <>
          <RadioGroup
            className="radio-group"
            value={size}
            onChange={(value) => {
              if (isTextSizeId(value)) setSize(value);
            }}
          >
            <Label className="field-label">Choose how big the words are</Label>
            <Text slot="description" className="field-hint">
              The change happens straight away, everywhere in Say It Once.
            </Text>
            {textSizes.map((t) => (
              <Radio key={t.id} value={t.id} className="radio">
                {t.label}
              </Radio>
            ))}
          </RadioGroup>
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
