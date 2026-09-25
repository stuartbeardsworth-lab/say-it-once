import type { AppointmentData, ContactData } from './types';

// Calendar (.ics) and contact card (.vcf) files, built from structured data
// (docs/spec.md, "Exports"). Private entries are never offered for export.

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 bytes are folded, as the calendar format requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (new TextEncoder().encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function compactDate(date: string): string {
  return date.replace(/-/g, '');
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function appointmentCalendar(
  id: string,
  appt: AppointmentData,
  recordName: string,
  now = new Date(),
): string {
  const where = [appt.organisation, appt.location].filter((s) => s.trim()).join(' — ');
  const description = [appt.person && `Seeing: ${appt.person}`, `Record: ${recordName}`].filter(Boolean).join('\n');
  const summary = appt.purpose.trim() ? `${appt.purpose.trim()} appointment` : `Appointment: ${appt.organisation.trim()}`;
  let when: string[];
  if (appt.time) {
    const [h = 0, min = 0] = appt.time.split(':').map(Number);
    const endMinutes = h * 60 + min + 60;
    const endDate = endMinutes >= 24 * 60 ? nextDay(appt.date) : appt.date;
    const end = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}${String(endMinutes % 60).padStart(2, '0')}00`;
    when = [
      `DTSTART:${compactDate(appt.date)}T${appt.time.replace(':', '')}00`,
      `DTEND:${compactDate(endDate)}T${end}`,
    ];
  } else {
    when = [`DTSTART;VALUE=DATE:${compactDate(appt.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(appt.date))}`];
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Say It Once//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}@sayitonce.local`,
    `DTSTAMP:${utcStamp(now)}`,
    ...when,
    `SUMMARY:${icsText(summary)}`,
    ...(where ? [`LOCATION:${icsText(where)}`] : []),
    `DESCRIPTION:${icsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

function vcardText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function contactCard(contact: ContactData): string {
  const name = contact.organisation.trim() || contact.role.trim() || contact.phoneOrEmail.trim();
  const how = contact.phoneOrEmail.trim();
  const note = [contact.role && `Role: ${contact.role}`, contact.reference && `Reference: ${contact.reference}`]
    .filter(Boolean)
    .join('\n');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vcardText(name)}`,
    `ORG:${vcardText(contact.organisation.trim() || name)}`,
    ...(contact.role.trim() ? [`TITLE:${vcardText(contact.role.trim())}`] : []),
    ...(how ? [isEmail(how) ? `EMAIL:${vcardText(how)}` : `TEL:${vcardText(how)}`] : []),
    ...(note ? [`NOTE:${vcardText(note)}`] : []),
    'END:VCARD',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** A file name that works on every phone and computer. */
export function safeFileName(name: string, extension: string): string {
  const base = name.normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'say-it-once';
  return `${base}.${extension}`;
}
