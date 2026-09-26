// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Checks the colours in styles.css against WCAG 2.2 AA: 4.5:1 for text,
// 3:1 for the edges of controls, the focus outline and meaningful icons.
// The pairs are the ones the app actually uses.

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const root = /:root \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

function token(name: string): string {
  const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(root)?.[1]?.trim();
  if (!value) throw new Error(`No --${name} in styles.css`);
  const ref = /^var\(--([\w-]+)\)$/.exec(value);
  return ref ? token(ref[1]!) : value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

const white = '#ffffff';
const text: [string, string][] = [
  ['colour-text', 'colour-background'],
  ['colour-text', 'colour-surface'],
  ['colour-text-muted', 'colour-background'],
  ['colour-text-muted', 'colour-surface'],
  ['colour-text-muted', 'colour-peach'],
  ['colour-text-muted', 'colour-sand'],
  ['colour-link', 'colour-background'],
  ['colour-emerald', 'colour-background'],
  ['colour-emerald', 'colour-surface'],
  ['colour-orange-text', 'colour-background'],
  ['colour-orange-text', 'colour-surface'],
  ['colour-orange-text', 'colour-peach'],
  ['colour-danger', 'colour-surface'],
  ['colour-danger', 'colour-error-background'],
  ['colour-text', 'colour-info-background'],
  ['colour-text', 'colour-error-background'],
  ['colour-navy', 'colour-navy-soft'],
  ['colour-focus-text', 'colour-focus-background'],
];

const edges: [string, string][] = [
  ['colour-border', 'colour-surface'],
  ['colour-border', 'colour-background'],
  ['colour-focus-text', 'colour-background'],
  ['colour-focus-text', 'colour-surface'],
  ['colour-emerald', 'colour-mint'],
  ['colour-orange-text', 'colour-surface'],
];

describe('colour contrast (WCAG 2.2 AA)', () => {
  it.each(text)('text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('white text on the navy header and buttons is at least 4.5:1', () => {
    expect(contrast(white, token('colour-navy'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(white, token('colour-danger'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(edges)('edge %s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it('the orange of the focus outline shows against the navy header', () => {
    expect(contrast(token('colour-focus'), token('colour-navy'))).toBeGreaterThanOrEqual(3);
  });

  it('the original orange is kept for decoration, and is too light for text', () => {
    expect(token('colour-orange')).toBe('#e8714a');
    expect(contrast(token('colour-orange'), token('colour-background'))).toBeLessThan(4.5);
  });
});
