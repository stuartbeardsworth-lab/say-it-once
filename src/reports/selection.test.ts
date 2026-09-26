import { describe, expect, it } from 'vitest';
import { exampleItems } from '../fixtures/example';
import { toShareable } from '../shareable/toShareable';
import { purposeByKey } from './purposes';
import { countShareable, defaultSelection, describeRule, selectionFromIds } from './selection';

const today = '2026-06-01';
const { view } = toShareable('ex-record', exampleItems(today));
const full = purposeByKey('full-record')!;

describe('selection from chosen entries', () => {
  it('includes only the sections holding the chosen entries', () => {
    const s = selectionFromIds(full, view, ['ex-appt-past', 'ex-contact-hr']);
    expect(s.appointments).toEqual({ included: true, ids: ['ex-appt-past'] });
    expect(s.contacts).toEqual({ included: true, ids: ['ex-contact-hr'] });
    expect(s.impact?.included).toBe(false);
    expect(s.account?.included).toBe(false);
  });

  it('ignores private entries, even when asked for them', () => {
    const s = selectionFromIds(full, view, ['ex-appt-private', 'ex-contact-private', 'ex-doc-private']);
    expect(Object.values(s).every((sec) => !sec.included && sec.ids.length === 0)).toBe(true);
    expect(countShareable(view, ['ex-appt-private', 'ex-appt-past', 'nonsense'])).toBe(1);
  });
});

describe('defaults', () => {
  it('the appointment brief takes the next 2 and the last 4 appointments', () => {
    const s = defaultSelection(purposeByKey('appointment-brief')!, view, today);
    expect(s.appointments?.ids.sort()).toEqual(['ex-appt-next', 'ex-appt-past', 'ex-appt-physio'].sort());
  });

  it('describes each rule in plain words', () => {
    expect(describeRule(undefined)).toBe('Everything');
    expect(describeRule({ pick: 'newest', limit: 6 })).toBe('The newest 6');
    expect(describeRule({ pick: 'nextAndRecent', next: 2, recent: 4 })).toBe('The next 2 and the last 4');
  });
});
