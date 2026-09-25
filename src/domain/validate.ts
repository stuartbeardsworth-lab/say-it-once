import { isIsoDate, isTime } from './dates';
import { privateCapable, type ItemDataMap, type ItemType } from './types';
import {
  appointmentTypes,
  costKinds,
  difficulties,
  effects,
  feelings,
  howOften,
  impactAreas,
  medicationStatuses,
  painLevels,
  sections,
  yesNoNotSure,
} from './vocab';

// Checks an item before it is saved. Messages are written for the person
// using the app: they say what to do, calmly, and point at one field each.
// Anything a form could never produce (a wrong type, an unknown choice) is
// reported too, so a bug can't quietly store bad data.

export type FieldErrors = Record<string, string>;
export type ValidationResult = { ok: true } | { ok: false; errors: FieldErrors };

/** Longest text accepted in one field: about 30 pages of writing. */
export const maxTextLength = 50_000;

type Checker<T extends ItemType> = (data: ItemDataMap[T], errors: FieldErrors) => void;

function text(errors: FieldErrors, field: string, value: unknown) {
  if (typeof value !== 'string') errors[field] = 'This must be text.';
  else if (value.length > maxTextLength) errors[field] = 'This is too long to save. Try splitting it into two notes.';
}

function date(errors: FieldErrors, field: string, value: unknown, label = 'date') {
  if (typeof value !== 'string') errors[field] = 'This must be a date.';
  else if (value !== '' && !isIsoDate(value)) errors[field] = `Enter a real ${label}, for example 14 3 2026.`;
}

function time(errors: FieldErrors, field: string, value: unknown) {
  if (typeof value !== 'string') errors[field] = 'This must be a time.';
  else if (value !== '' && !isTime(value)) errors[field] = 'Enter a time such as 09:30 or 14:15.';
}

function choice(errors: FieldErrors, field: string, value: unknown, options: readonly string[]) {
  if (value !== '' && !options.includes(value as string)) errors[field] = 'Choose one of the options.';
}

function link(errors: FieldErrors, field: string, value: unknown) {
  if (value !== null && typeof value !== 'string') errors[field] = 'This link is not valid.';
}

function texts(errors: FieldErrors, data: object, fields: readonly string[]) {
  for (const f of fields) text(errors, f, (data as Record<string, unknown>)[f]);
}

function blank(value: string) {
  return value.trim() === '';
}

const checkers: { [T in ItemType]: Checker<T> } = {
  profile(d, e) {
    text(e, 'personName', d.personName);
  },
  recordMeta(d, e) {
    text(e, 'name', d.name);
    if (!e.name && blank(d.name)) e.name = 'Give this record a name, such as "My record".';
    date(e, 'impactCurrentSince', d.impactCurrentSince);
  },
  incident(d, e) {
    texts(e, d, ['place', 'before', 'what', 'after', 'told', 'injuries', 'witnesses', 'services', 'treatment', 'complications', 'ongoingCare']);
    date(e, 'date', d.date);
    time(e, 'time', d.time);
  },
  impactArea(d, e) {
    if (!impactAreas.some((a) => a.key === d.areaKey)) e.areaKey = 'Choose which area of life this is about.';
    choice(e, 'difficulty', d.difficulty, difficulties);
    choice(e, 'often', d.often, howOften);
    texts(e, d, ['detail', 'help', 'aid', 'safety', 'timeLonger', 'standard']);
    const filled = [d.difficulty, d.detail, d.help, d.aid, d.often, d.safety, d.timeLonger, d.standard].some(
      (v) => typeof v === 'string' && !blank(v),
    );
    if (!filled && !e.detail) e.detail = 'Add a few words about how this has changed, or choose how difficult it is.';
  },
  impactNote(d, e) {
    text(e, 'text', d.text);
  },
  impactSnapshot(d, e) {
    date(e, 'date', d.date);
    if (!Array.isArray(d.areas)) e.areas = 'This snapshot is not valid.';
  },
  checkIn(d, e) {
    date(e, 'date', d.date);
    if (!e.date && blank(d.date)) e.date = 'Add the date of this check-in.';
    choice(e, 'pain', d.pain, painLevels);
    choice(e, 'feeling', d.feeling, feelings);
    text(e, 'note', d.note);
    if (d.pulse !== null && (!Number.isInteger(d.pulse) || d.pulse < 20 || d.pulse > 250)) {
      e.pulse = 'Pulse must be a whole number between 20 and 250.';
    }
    if (!d.pain && !d.feeling && d.pulse === null && typeof d.note === 'string' && blank(d.note)) {
      e.pain = 'Choose how your pain is, how you feel, or add a note.';
    }
  },
  appointment(d, e) {
    date(e, 'date', d.date, 'appointment date');
    if (!e.date && blank(d.date)) e.date = 'Add the date of the appointment.';
    time(e, 'time', d.time);
    texts(e, d, ['organisation', 'person', 'purpose', 'location', 'told', 'next']);
    if (!e.organisation && blank(d.organisation)) e.organisation = 'Add who the appointment is with.';
    choice(e, 'type', d.type, appointmentTypes);
    link(e, 'documentId', d.documentId);
  },
  treatment(d, e) {
    texts(e, d, ['name', 'note']);
    if (!e.name && blank(d.name)) e.name = 'Add the name of the treatment.';
    date(e, 'date', d.date);
    choice(e, 'effect', d.effect, effects);
  },
  medication(d, e) {
    texts(e, d, ['name', 'forWhat', 'dose', 'often', 'sideEffects']);
    if (!e.name && blank(d.name)) e.name = 'Add the name of the medication.';
    choice(e, 'status', d.status, medicationStatuses);
    choice(e, 'effect', d.effect, effects);
    date(e, 'started', d.started);
  },
  cost(d, e) {
    if (!costKinds.includes(d.kind)) e.kind = 'Choose money spent or income lost.';
    date(e, 'date', d.date);
    if (!e.date && blank(d.date)) e.date = d.kind === 'income' ? 'Add the date the lost income started.' : 'Add the date.';
    date(e, 'dateTo', d.dateTo);
    if (d.kind === 'expense' && d.dateTo !== '') e.dateTo = 'An end date is only used for lost income.';
    if (!e.dateTo && d.dateTo && d.date && d.dateTo < d.date) e.dateTo = 'The end date must be on or after the start date.';
    texts(e, d, ['item', 'evidence']);
    if (!e.item && blank(d.item)) e.item = d.kind === 'income' ? 'Add what income was lost.' : 'Add what the money was spent on.';
    if (d.amountPence !== null && (!Number.isInteger(d.amountPence) || d.amountPence < 0)) {
      e.amountPence = 'Enter an amount in pounds and pence, such as 12.50.';
    }
    link(e, 'documentId', d.documentId);
  },
  document(d, e) {
    texts(e, d, ['title', 'from', 'point', 'wording', 'paperCopy']);
    date(e, 'date', d.date);
    date(e, 'actBy', d.actBy);
    if (typeof d.done !== 'boolean') e.done = 'This must be yes or no.';
    if (d.relatedTo !== null && !sections.includes(d.relatedTo.section)) e.relatedTo = 'Choose what this relates to.';
    if (!e.title && d.file === null && blank(d.title)) e.title = 'Add a name for this document, or add the file.';
  },
  contact(d, e) {
    texts(e, d, ['organisation', 'role', 'reference', 'phoneOrEmail']);
    if (!e.organisation && blank(d.organisation) && blank(d.phoneOrEmail)) {
      e.organisation = 'Add a name or organisation, or a phone number or email.';
    }
  },
  quickNote(d, e) {
    text(e, 'text', d.text);
    if (d.filedTo !== null && !sections.includes(d.filedTo.section)) e.filedTo = 'Choose where to file this note.';
    link(e, 'photoFileId', d.photoFileId);
    if (!e.text && d.photoFileId === null && blank(d.text)) e.text = 'Write a few words, or add a photo.';
  },
  workDetails(d, e) {
    texts(e, d, ['employer', 'workplace', 'jobTitle', 'payrollRef', 'reportedTo']);
    for (const f of ['employmentStart', 'employmentEnd', 'reportDate', 'employmentSince'] as const) date(e, f, d[f]);
    choice(e, 'accidentReported', d.accidentReported, yesNoNotSure);
  },
};

export function validate<T extends ItemType>(type: T, data: ItemDataMap[T], isPrivate = false): ValidationResult {
  const errors: FieldErrors = {};
  if (typeof data !== 'object' || data === null) return { ok: false, errors: { item: 'Nothing to save.' } };
  (checkers[type] as Checker<T>)(data, errors);
  if (isPrivate && !privateCapable.has(type)) errors.private = 'This kind of entry cannot be marked private.';
  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
