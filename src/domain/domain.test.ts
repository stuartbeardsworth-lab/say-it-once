import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { blank } from './blank';
import { isIsoDate, isTime } from './dates';
import { formatPence, parsePounds } from './money';
import { upgrade } from './schema';
import { currentSchema, type Item, type ItemType } from './types';
import { validate } from './validate';

describe('money', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.05', 1205],
    ['£1,234.56', 123456],
    [' £0.99 ', 99],
    ['0', 0],
  ])('reads %s as %i pence', (input, pence) => {
    expect(parsePounds(input)).toBe(pence);
  });

  it.each(['', 'twelve', '12.345', '-5', '1e3', '£', '12..5'])('does not guess at %s', (input) => {
    expect(parsePounds(input)).toBeNull();
  });

  it('formats pence as pounds', () => {
    expect(formatPence(123456)).toBe('£1,234.56');
    expect(formatPence(5)).toBe('£0.05');
  });

  it('reads back every amount it formats', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000_00 }), (pence) => {
        expect(parsePounds(formatPence(pence))).toBe(pence);
      }),
    );
  });
});

describe('dates and times', () => {
  it.each(['2026-03-14', '2024-02-29', '1999-12-31'])('accepts %s', (d) => expect(isIsoDate(d)).toBe(true));
  it.each(['2026-02-29', '2026-13-01', '14/03/2026', '2026-3-14', ''])('rejects %s', (d) =>
    expect(isIsoDate(d)).toBe(false),
  );
  it.each(['00:00', '09:30', '23:59'])('accepts time %s', (t) => expect(isTime(t)).toBe(true));
  it.each(['24:00', '9:30', '12:60', 'noon'])('rejects time %s', (t) => expect(isTime(t)).toBe(false));
});

describe('validation', () => {
  const required: [ItemType, string][] = [
    ['appointment', 'date'],
    ['appointment', 'organisation'],
    ['treatment', 'name'],
    ['medication', 'name'],
    ['cost', 'date'],
    ['cost', 'item'],
    ['document', 'title'],
    ['contact', 'organisation'],
    ['quickNote', 'text'],
    ['checkIn', 'date'],
    ['checkIn', 'pain'],
    ['impactArea', 'detail'],
  ];

  it.each(required)('an empty %s asks for %s', (type, field) => {
    const result = validate(type, blank(type));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field]).toMatch(/\w/);
  });

  it.each(['profile', 'recordMeta', 'incident', 'impactNote', 'impactSnapshot', 'workDetails'] as const)(
    'an empty %s is fine',
    (type) => {
      expect(validate(type, blank(type))).toEqual({ ok: true });
    },
  );

  it('accepts a complete appointment', () => {
    expect(validate('appointment', blank('appointment', { date: '2026-03-14', time: '09:30', organisation: 'GP' }))).toEqual({
      ok: true,
    });
  });

  it('explains a bad date and a bad time in plain words', () => {
    const result = validate('appointment', blank('appointment', { date: '2026-02-30', time: '9am', organisation: 'GP' }));
    expect(result).toEqual({
      ok: false,
      errors: {
        date: 'Enter a real appointment date, for example 14 3 2026.',
        time: 'Enter a time such as 09:30 or 14:15.',
      },
    });
  });

  it('checks pulse is between 20 and 250', () => {
    const at = (pulse: number) => validate('checkIn', blank('checkIn', { date: '2026-03-14', pulse }));
    expect(at(19).ok).toBe(false);
    expect(at(20).ok).toBe(true);
    expect(at(250).ok).toBe(true);
    expect(at(251).ok).toBe(false);
    expect(at(72.5).ok).toBe(false);
  });

  it('only allows an end date on lost income, and not before the start', () => {
    const cost = (kind: 'expense' | 'income', dateTo: string) =>
      validate('cost', blank('cost', { kind, date: '2026-03-14', item: 'Wages', dateTo }));
    expect(cost('expense', '2026-03-20').ok).toBe(false);
    expect(cost('income', '2026-03-20').ok).toBe(true);
    expect(cost('income', '2026-03-01').ok).toBe(false);
  });

  it('refuses negative or fractional pence', () => {
    const cost = (amountPence: number) => validate('cost', blank('cost', { date: '2026-03-14', item: 'Taxi', amountPence }));
    expect(cost(-1).ok).toBe(false);
    expect(cost(12.5).ok).toBe(false);
    expect(cost(1250).ok).toBe(true);
  });

  it('refuses unknown choices', () => {
    const result = validate('medication', blank('medication', { name: 'Paracetamol', status: 'Maybe' as never }));
    expect(result.ok).toBe(false);
  });

  it('a document needs a name or a file', () => {
    const file = { fileId: 'f', name: 'scan.pdf', type: 'application/pdf', size: 10 };
    expect(validate('document', blank('document', { file })).ok).toBe(true);
    expect(validate('document', blank('document', { title: 'Letter' })).ok).toBe(true);
  });

  it('refuses very long text rather than storing it silently cut', () => {
    const result = validate('quickNote', blank('quickNote', { text: 'x'.repeat(50_001) }));
    expect(result.ok).toBe(false);
  });
});

describe('schema versions', () => {
  const item: Item<'quickNote'> = {
    id: 'a',
    recordId: 'r',
    type: 'quickNote',
    schema: currentSchema.quickNote,
    private: false,
    data: blank('quickNote', { text: 'hi' }),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('reads a current item unchanged', () => {
    expect(upgrade(item)).toEqual({ item, readOnly: false, upgraded: false });
  });

  it('shows an item from a newer version of the app as read-only', () => {
    const newer = { ...item, schema: currentSchema.quickNote + 1 };
    expect(upgrade(newer)).toMatchObject({ readOnly: true });
  });
});
