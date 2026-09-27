import { describe, expect, it } from 'vitest';
import { blank } from '../../domain/blank';
import { today } from '../../domain/dates';
import { canAddToCalendar } from './AddToCalendar';

const appt = (date: string, isPrivate = false) => ({
  id: 'a1',
  data: { ...blank('appointment'), date, organisation: 'Fracture clinic' },
  private: isPrivate,
});

describe('canAddToCalendar', () => {
  it('offers the calendar for an appointment today or later', () => {
    expect(canAddToCalendar(appt(today()))).toBe(true);
    expect(canAddToCalendar(appt('2999-01-01'))).toBe(true);
  });

  it('never for a private appointment, which doesn’t leave the app', () => {
    expect(canAddToCalendar(appt('2999-01-01', true))).toBe(false);
  });

  it('not for one that has already happened', () => {
    expect(canAddToCalendar(appt('2000-01-01'))).toBe(false);
  });
});
