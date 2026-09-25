// Dates for people to read, in UK style. Stored dates stay YYYY-MM-DD.

export function readableDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
