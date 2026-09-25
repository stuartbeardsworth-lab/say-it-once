// Money is stored as whole pence, never as text or floating point.

/**
 * Reads what a person typed as an amount of pounds: "12", "12.5", "£1,234.56".
 * Returns null for anything that isn't a clear amount, rather than guessing.
 */
export function parsePounds(input: string): number | null {
  const cleaned = input.trim().replace(/^£/, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [pounds = '0', pence = ''] = cleaned.split('.');
  return Number(pounds) * 100 + Number(pence.padEnd(2, '0'));
}

export function formatPence(pence: number): string {
  const pounds = Math.floor(pence / 100);
  const rest = String(pence % 100).padStart(2, '0');
  return `£${pounds.toLocaleString('en-GB')}.${rest}`;
}
