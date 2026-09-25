import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Text size scales the root font size, and every size in the stylesheet is
// in rem, so the whole app grows together (fixes D8 in docs/spec.md).
// Percentages build on the size the person has set in their browser or
// phone, rather than replacing it.
//
// Stage 1: the choice lasts until the page is reloaded. Remembering it needs
// the local store, which arrives in Stage 2. It will not be kept in
// localStorage, because nothing in this app falls back to other storage.

export const textSizes = [
  { id: 'standard', label: 'Standard', scale: '100%' },
  { id: 'large', label: 'Large', scale: '125%' },
  { id: 'larger', label: 'Larger', scale: '150%' },
  { id: 'largest', label: 'Largest', scale: '175%' },
] as const;

export type TextSizeId = (typeof textSizes)[number]['id'];

interface TextSizeContextValue {
  size: TextSizeId;
  setSize: (size: TextSizeId) => void;
}

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<TextSizeId>('standard');

  useEffect(() => {
    const chosen = textSizes.find((t) => t.id === size) ?? textSizes[0];
    document.documentElement.style.fontSize = chosen.scale;
  }, [size]);

  return <TextSizeContext.Provider value={{ size, setSize }}>{children}</TextSizeContext.Provider>;
}

export function useTextSize(): TextSizeContextValue {
  const value = useContext(TextSizeContext);
  if (!value) throw new Error('useTextSize must be used inside TextSizeProvider');
  return value;
}
