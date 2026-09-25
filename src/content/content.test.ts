import { describe, expect, it } from 'vitest';
import { support } from './support';

describe('Find support content', () => {
  const everyone = [...support.urgent, ...support.groups.flatMap((g) => g.organisations)];

  it('has a name and description for everyone', () => {
    for (const c of everyone) {
      expect(c.name.trim()).not.toBe('');
      expect(c.description.trim()).not.toBe('');
    }
  });

  it('only links to secure websites', () => {
    for (const c of everyone) if (c.url) expect(c.url).toMatch(/^https:\/\/[^\s]+$/);
  });

  it('writes phone numbers as digits and spaces only', () => {
    for (const c of everyone) if (c.phone) expect(c.phone).toMatch(/^[\d ]+$/);
  });

  it('keeps 999, NHS 111 and Samaritans at the top', () => {
    expect(support.urgent.map((c) => c.phone)).toEqual(['999', '111', '116 123']);
  });
});
