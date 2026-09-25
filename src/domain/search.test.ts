import { describe, expect, it } from 'vitest';
import { blank } from './blank';
import { quickAnswers, search } from './search';
import type { AnyItem, ItemDataMap, ItemType } from './types';

let n = 0;
function item<T extends ItemType>(type: T, data: Partial<ItemDataMap[T]>, updatedAt = `2026-01-${String(++n).padStart(2, '0')}T00:00:00.000Z`): AnyItem {
  return { id: `id${n}`, recordId: 'r', type, schema: 1, private: false, data: blank(type, data), createdAt: updatedAt, updatedAt } as AnyItem;
}

const items = [
  item('appointment', { date: '2026-03-14', organisation: 'Fracture clinic', told: 'The wrist is healing well' }),
  item('quickNote', { text: 'Ask about the wrist splint' }),
  item('contact', { organisation: 'Headway', phoneOrEmail: '0808 800 2244' }),
  item('cost', { kind: 'expense', date: '2026-03-14', item: 'Taxi', amountPence: 1250 }),
  item('cost', { kind: 'income', date: '2026-03-15', item: 'Wages', amountPence: 50000 }),
  item('medication', { name: 'Naproxen', status: 'Still taking' }),
  item('medication', { name: 'Codeine', status: 'Stopped' }),
  item('medication', { name: 'Paracetamol' }),
  item('recordMeta', { name: 'wrist record' }),
];

describe('search', () => {
  it('finds every entry mentioning a word, in any field, newest first', () => {
    const results = search(items, 'Wrist');
    expect(results.map((r) => r.kind)).toEqual(['Quick Note', 'Appointment']);
    expect(results[1]?.snippet).toContain('The wrist is healing well');
  });

  it('needs every word to match', () => {
    expect(search(items, 'wrist splint')).toHaveLength(1);
    expect(search(items, 'wrist taxi')).toHaveLength(0);
  });

  it('filters by kind', () => {
    expect(search(items, 'wrist', 'appointments').map((r) => r.kind)).toEqual(['Appointment']);
  });

  it('never searches the record’s own name or returns nothing for an empty query', () => {
    expect(search(items, 'record')).toHaveLength(0);
    expect(search(items, '   ')).toHaveLength(0);
  });
});

describe('quick answers', () => {
  it('adds up money spent and lost', () => {
    const a = quickAnswers(items, '2026-01-01');
    expect(a.spentPence).toBe(1250);
    expect(a.lostPence).toBe(50000);
  });

  it('lists medication that isn’t marked as stopped', () => {
    const names = quickAnswers(items, '2026-01-01').currentMedication.map((m) => m.data as ItemDataMap['medication']).map((d) => d.name);
    expect(names.sort()).toEqual(['Naproxen', 'Paracetamol']);
  });

  it('finds the next appointment from today', () => {
    expect(quickAnswers(items, '2026-03-01').nextAppointment?.data.organisation).toBe('Fracture clinic');
    expect(quickAnswers(items, '2026-03-15').nextAppointment).toBeUndefined();
  });
});
