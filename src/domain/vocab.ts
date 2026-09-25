// Fixed vocabularies from docs/spec.md, "Fixed vocabularies". The stored
// value is the wording the person sees, so records stay readable in exports.

export const impactAreas = [
  { key: 'food', label: 'Preparing food' },
  { key: 'eat', label: 'Eating and drinking' },
  { key: 'therapy', label: 'Managing treatment and medication' },
  { key: 'wash', label: 'Washing and bathing' },
  { key: 'toilet', label: 'Using the toilet' },
  { key: 'dress', label: 'Dressing and undressing' },
  { key: 'speak', label: 'Speaking and being understood' },
  { key: 'read', label: 'Reading and understanding information' },
  { key: 'people', label: 'Mixing with other people' },
  { key: 'money', label: 'Managing money' },
  { key: 'journey', label: 'Going out and getting around' },
  { key: 'move', label: 'Walking and moving around' },
] as const;
export type ImpactAreaKey = (typeof impactAreas)[number]['key'];

export const difficulties = [
  'I manage this',
  'It is harder now',
  'I find this very difficult',
  'I cannot do it at all',
] as const;

export const howOften = ['Now and then', 'Most days', 'Every day', 'It varies a lot'] as const;

export const effects = [
  'Helped a lot',
  'Helped a little',
  'No real change',
  'Made things worse',
  'Too early to tell',
  'Not sure',
] as const;

export const medicationStatuses = ['Still taking', 'Stopped', 'Take when needed', 'Not sure'] as const;

export const appointmentTypes = ['In person', 'Phone', 'Video', 'Other'] as const;

export const painLevels = ['Low', 'Medium', 'High'] as const;

export const feelings = ['Good', 'Okay', 'Struggling'] as const;

export const costKinds = ['expense', 'income'] as const;

export const yesNoNotSure = ['Yes', 'No', 'Not sure'] as const;

// Where a Quick Note can be filed, and what a document can relate to.
export const sections = ['what', 'impact', 'appointments', 'treatment', 'documents', 'costs', 'contacts'] as const;
export type SectionKey = (typeof sections)[number];

/** A choice that has not been made yet is stored as ''. */
export type Choice<T extends readonly string[]> = T[number] | '';

export const sectionLabels: Record<SectionKey, string> = {
  what: 'What happened',
  impact: 'How it affects me',
  appointments: 'Appointments',
  treatment: 'Treatment & medication',
  documents: 'Letters & documents',
  costs: 'Costs & lost income',
  contacts: 'Contacts',
};

export function impactAreaLabel(key: string): string {
  return impactAreas.find((a) => a.key === key)?.label ?? 'Something else';
}
