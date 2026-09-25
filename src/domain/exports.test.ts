import { describe, expect, it } from 'vitest';
import { blank } from './blank';
import { appointmentCalendar, contactCard, isEmail, safeFileName } from './exports';

const now = new Date('2026-09-25T10:00:00Z');

describe('calendar file', () => {
  it('makes a timed event lasting an hour', () => {
    const ics = appointmentCalendar(
      'abc',
      blank('appointment', { date: '2026-10-02', time: '09:30', organisation: 'St Mary’s', purpose: 'Physio', location: 'Outpatients, level 2', person: 'Dr Shah' }),
      'My record',
      now,
    );
    expect(ics).toContain('UID:abc@sayitonce.local\r\n');
    expect(ics).toContain('DTSTART:20261002T093000\r\n');
    expect(ics).toContain('DTEND:20261002T103000\r\n');
    expect(ics).toContain('SUMMARY:Physio appointment\r\n');
    expect(ics).toContain('LOCATION:St Mary’s — Outpatients\\, level 2\r\n');
    expect(ics).toContain('DESCRIPTION:Seeing: Dr Shah\\nRecord: My record\r\n');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });

  it('makes an all-day event when there is no time', () => {
    const ics = appointmentCalendar('abc', blank('appointment', { date: '2026-12-31', organisation: 'GP' }), 'R', now);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).toContain('SUMMARY:Appointment: GP\r\n');
  });

  it('escapes semicolons and commas in text', () => {
    const ics = appointmentCalendar('abc', blank('appointment', { date: '2026-10-02', organisation: 'A; B, C' }), 'R', now);
    expect(ics).toContain('SUMMARY:Appointment: A\\; B\\, C\r\n');
  });

  it('folds long lines to 75 bytes', () => {
    const ics = appointmentCalendar('abc', blank('appointment', { date: '2026-10-02', organisation: 'A'.repeat(200) }), 'R', now);
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe('contact card', () => {
  it('uses TEL for a phone number and EMAIL for an address', () => {
    const phone = contactCard(blank('contact', { organisation: 'Headway', role: 'Helpline', phoneOrEmail: '0808 800 2244', reference: 'A1' }));
    expect(phone).toContain('FN:Headway\r\n');
    expect(phone).toContain('TEL:0808 800 2244\r\n');
    expect(phone).toContain('NOTE:Role: Helpline\\nReference: A1\r\n');
    const email = contactCard(blank('contact', { organisation: 'Solicitor', phoneOrEmail: 'jo@example.com' }));
    expect(email).toContain('EMAIL:jo@example.com\r\n');
  });

  it('recognises email addresses', () => {
    expect(isEmail('jo@example.com')).toBe(true);
    expect(isEmail('0808 800 2244')).toBe(false);
  });
});

it('makes safe file names', () => {
  expect(safeFileName('St Mary’s / Physio?', 'ics')).toBe('St-Marys-Physio.ics');
  expect(safeFileName('', 'vcf')).toBe('say-it-once.vcf');
});
