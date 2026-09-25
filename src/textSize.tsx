import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SaveState } from './components/SaveStatus';
import { messageFor } from './forms/useAutosave';
import { useStore } from './store/StoreContext';

// Text size scales the root font size, and every size in the stylesheet is
// in rem, so the whole app grows together (fixes D8 in docs/spec.md).
// Percentages build on the size the person has set in their browser or
// phone, rather than replacing it.
//
// The choice is remembered on this device only (a phone and a laptop often
// need different sizes), in the store's device-only table.

export const textSizes = [
  { id: 'standard', label: 'Standard', scale: '100%' },
  { id: 'large', label: 'Large', scale: '125%' },
  { id: 'larger', label: 'Larger', scale: '150%' },
  { id: 'largest', label: 'Largest', scale: '175%' },
] as const;

export type TextSizeId = (typeof textSizes)[number]['id'];

export function isTextSizeId(value: unknown): value is TextSizeId {
  return textSizes.some((t) => t.id === value);
}

interface TextSizeContextValue {
  size: TextSizeId;
  setSize: (size: TextSizeId) => void;
  /** Whether the choice has been remembered. */
  saveStatus: SaveState;
  dismissSaveStatus: () => void;
}

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const { store, status } = useStore();
  const [size, setSizeState] = useState<TextSizeId>('standard');
  const [saveStatus, setSaveStatus] = useState<SaveState>({ kind: 'idle' });

  // Once storage is open, use the size chosen last time.
  const ready = status.kind !== 'opening';
  useEffect(() => {
    if (!ready) return;
    let current = true;
    store.getPreference('textSize').then(
      (saved) => {
        if (current && isTextSizeId(saved)) setSizeState(saved);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [store, ready]);

  useEffect(() => {
    const chosen = textSizes.find((t) => t.id === size) ?? textSizes[0];
    document.documentElement.style.fontSize = chosen.scale;
  }, [size]);

  function setSize(next: TextSizeId) {
    // The page changes straight away; remembering it is reported separately.
    setSizeState(next);
    setSaveStatus({ kind: 'saving' });
    store.setPreference('textSize', next).then(
      () => setSaveStatus({ kind: 'saved' }),
      (error: unknown) => setSaveStatus({ kind: 'failed', message: messageFor(error) }),
    );
  }

  return (
    <TextSizeContext.Provider
      value={{ size, setSize, saveStatus, dismissSaveStatus: () => setSaveStatus({ kind: 'idle' }) }}
    >
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize(): TextSizeContextValue {
  const value = useContext(TextSizeContext);
  if (!value) throw new Error('useTextSize must be used inside TextSizeProvider');
  return value;
}
