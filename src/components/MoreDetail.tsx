import { useState, type ReactNode } from 'react';

// The one fold-out in each form, for the details most people never need
// (decided 1 October 2026). Above it, a calm line says the fields so far
// are enough, so leaving the rest empty feels normal, not unfinished.
//
// It starts open when an entry being edited already has something in it,
// so nothing the person wrote is hidden. That's decided once, when the
// form opens, so it never folds away while they type.

export const enoughToSave = 'That’s enough to save. You can add more later, or never.';

export function MoreDetail({
  hasContent = false,
  note = enoughToSave,
  children,
}: {
  /** True when the entry already has something in these fields. */
  hasContent?: boolean;
  note?: string;
  children: ReactNode;
}) {
  const [startOpen] = useState(hasContent);
  return (
    <>
      <p className="enough-note">{note}</p>
      <details className="more" open={startOpen}>
        <summary>Add more detail (only if it helps)</summary>
        {children}
      </details>
    </>
  );
}

/** True if any of these values has something in it. */
export function anyFilled(...values: unknown[]): boolean {
  return values.some((v) => (typeof v === 'string' ? v.trim() !== '' : v !== null && v !== undefined && v !== false));
}
