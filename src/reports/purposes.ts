// Purposes as data (docs/architecture.md, "Purpose config"; decisions Q3,
// Q4, Q14, Q17). Adding or changing a purpose is a change here, with a test,
// never a new code path.

export type SectionKey =
  | 'currentPosition'
  | 'account'
  | 'injuries'
  | 'work'
  | 'impact'
  | 'changes'
  | 'treatment'
  | 'appointments'
  | 'costSummary'
  | 'costs'
  | 'contacts'
  | 'quickNotes'
  | 'documents'
  | 'chronology';

/** How a section's entries are chosen by default. The person can change it. */
export type DefaultRule =
  | { pick: 'all' }
  | { pick: 'newest'; limit: number }
  /** Upcoming appointments first (soonest), then the most recent past ones (Q17). */
  | { pick: 'nextAndRecent'; next: number; recent: number };

export interface SectionConfig {
  key: SectionKey;
  /** A different title for this purpose, if needed. */
  title?: string;
  rule?: DefaultRule;
}

export type Audience = 'healthcare' | 'benefits' | 'legal' | 'insurance' | 'work' | 'family' | 'self';

export interface Purpose {
  key: string;
  audience: Audience;
  /** The report's title. */
  title: string;
  /** What the person chooses in "Help me choose". */
  need: string;
  /** One sentence at the top of the report saying what it is for. */
  intro: string;
  kind: 'summary' | 'evidence';
  sections: SectionConfig[];
  /** Name, signature and date lines at the end (Q14: Full Record and evidence only). */
  signature: boolean;
}

export const audiences: { key: Audience; label: string }[] = [
  { key: 'healthcare', label: 'A doctor, nurse or therapist' },
  { key: 'benefits', label: 'Benefits: the DWP or a form' },
  { key: 'legal', label: 'A solicitor' },
  { key: 'insurance', label: 'An insurer' },
  { key: 'work', label: 'My employer or occupational health' },
  { key: 'family', label: 'Family or someone who supports me' },
  { key: 'self', label: 'Just for me' },
];

export const sectionTitles: Record<SectionKey, string> = {
  currentPosition: 'How things are now',
  account: 'What happened',
  injuries: 'Injuries and symptoms',
  work: 'Work at the time',
  impact: 'How it affects me',
  changes: 'Changes over time',
  treatment: 'Treatment and medication',
  appointments: 'Appointments',
  costSummary: 'Financial impact',
  costs: 'Costs and lost income',
  contacts: 'Contacts',
  quickNotes: 'Other notes',
  documents: 'Letters and documents',
  chronology: 'Chronology',
};

const all: DefaultRule = { pick: 'all' };
const newest = (limit: number): DefaultRule => ({ pick: 'newest', limit });

export const purposes: Purpose[] = [
  {
    key: 'appointment-brief',
    audience: 'healthcare',
    need: 'Getting ready for an appointment',
    title: 'Appointment brief',
    intro: 'A short brief to help at a health appointment: how things are now, treatment and recent appointments.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'currentPosition', title: 'Current position' },
      { key: 'impact', rule: all },
      { key: 'changes', title: 'Recent changes', rule: newest(6) },
      { key: 'treatment', rule: all },
      { key: 'appointments', title: 'Appointments and next steps', rule: { pick: 'nextAndRecent', next: 2, recent: 4 } },
    ],
  },
  {
    key: 'health-overview',
    audience: 'healthcare',
    need: 'A short overview of my health',
    title: 'Health overview',
    intro: 'An overview of what happened, its effects, and treatment so far.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'account', title: 'Relevant background' },
      { key: 'injuries' },
      { key: 'treatment', rule: all },
      { key: 'impact', rule: all },
      { key: 'appointments', rule: newest(6) },
    ],
  },
  {
    key: 'recent-changes',
    audience: 'healthcare',
    need: 'What has changed recently',
    title: 'Recent changes summary',
    intro: 'What has changed recently, with earlier positions for comparison.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'currentPosition', title: 'Current position' },
      { key: 'changes', rule: newest(10) },
      { key: 'treatment', rule: newest(6) },
    ],
  },
  {
    key: 'pip',
    audience: 'benefits',
    need: 'A PIP claim or review',
    title: 'PIP support pack',
    intro: 'Supporting information for a Personal Independence Payment claim or review, focused on daily living and getting around.',
    kind: 'evidence',
    signature: true,
    sections: [
      { key: 'impact', rule: all },
      { key: 'changes', rule: newest(10) },
      { key: 'treatment', rule: all },
      { key: 'contacts', rule: all },
      { key: 'appointments', rule: newest(6) },
      { key: 'quickNotes', rule: newest(10) },
      { key: 'documents', rule: all },
    ],
  },
  {
    key: 'iidb',
    audience: 'benefits',
    need: 'Industrial Injuries Disablement Benefit',
    title: 'IIDB support pack',
    intro: 'Supporting information for an Industrial Injuries Disablement Benefit claim: the accident at work and its effects.',
    kind: 'evidence',
    signature: true,
    sections: [
      { key: 'work' },
      { key: 'account' },
      { key: 'injuries' },
      { key: 'impact', rule: all },
      { key: 'treatment', rule: all },
      { key: 'appointments', rule: newest(10) },
      { key: 'documents', rule: all },
      { key: 'chronology', rule: all },
    ],
  },
  {
    key: 'other-benefit',
    audience: 'benefits',
    need: 'Another benefit or form',
    title: 'Summary for a benefit or form',
    intro: 'A summary to help with a benefit claim or form.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'account' },
      { key: 'injuries' },
      { key: 'impact', rule: all },
      { key: 'treatment', rule: all },
      { key: 'appointments', rule: newest(6) },
    ],
  },
  {
    key: 'personal-injury',
    audience: 'legal',
    need: 'A personal injury claim',
    title: 'Personal injury case summary',
    intro: 'A summary for a personal injury claim: what happened, its effects, treatment and costs.',
    kind: 'evidence',
    signature: true,
    sections: [
      { key: 'currentPosition' },
      { key: 'account' },
      { key: 'injuries' },
      { key: 'impact', rule: all },
      { key: 'treatment', rule: all },
      { key: 'changes', rule: all },
      { key: 'costSummary' },
      { key: 'contacts', rule: all },
      { key: 'appointments', rule: all },
      { key: 'quickNotes', rule: all },
      { key: 'documents', rule: all },
      { key: 'costs', title: 'Detailed costs and lost income', rule: all },
      { key: 'chronology', rule: all },
    ],
  },
  {
    key: 'treatment-concerns',
    audience: 'legal',
    need: 'Concerns about medical treatment',
    title: 'Medical treatment concerns summary',
    intro: 'A summary of treatment and what happened at each stage, for a solicitor looking at concerns about medical care.',
    kind: 'evidence',
    signature: true,
    sections: [
      { key: 'account' },
      { key: 'treatment', rule: all },
      { key: 'appointments', rule: all },
      { key: 'impact', rule: all },
      { key: 'documents', rule: all },
      { key: 'chronology', rule: all },
    ],
  },
  {
    key: 'insurance-summary',
    audience: 'insurance',
    need: 'An overview for an insurer',
    title: 'Insurance claim summary',
    intro: 'An overview for an insurance claim.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'currentPosition' },
      { key: 'account' },
      { key: 'treatment', rule: all },
      { key: 'costSummary' },
      { key: 'contacts', rule: all },
    ],
  },
  {
    key: 'insurance-costs',
    audience: 'insurance',
    need: 'Costs or lost income',
    title: 'Costs and lost income summary',
    intro: 'Money spent and income lost because of the injury or illness, with supporting documents.',
    kind: 'evidence',
    signature: true,
    sections: [{ key: 'costSummary' }, { key: 'costs', rule: all }, { key: 'documents', rule: all }],
  },
  {
    key: 'insurance-evidence',
    audience: 'insurance',
    need: 'Evidence for a claim',
    title: 'Insurance evidence pack',
    intro: 'Evidence for an insurance claim: what happened, treatment, costs and documents.',
    kind: 'evidence',
    signature: true,
    sections: [
      { key: 'account' },
      { key: 'injuries' },
      { key: 'treatment', rule: all },
      { key: 'costSummary' },
      { key: 'costs', rule: all },
      { key: 'contacts', rule: all },
      { key: 'documents', rule: all },
    ],
  },
  {
    key: 'work',
    audience: 'work',
    need: 'My employer or occupational health',
    title: 'Work and occupational health summary',
    intro: 'A summary for an employer or occupational health: how things are, treatment and what may help at work.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'currentPosition' },
      { key: 'treatment', rule: all },
      { key: 'impact', rule: all },
      { key: 'changes', rule: newest(6) },
      { key: 'appointments', rule: { pick: 'nextAndRecent', next: 3, recent: 3 } },
    ],
  },
  {
    key: 'family',
    audience: 'family',
    need: 'Family or someone who supports me',
    title: 'Family support overview',
    intro: 'An overview for family or someone who supports me, so they know how things are.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'currentPosition' },
      { key: 'impact', rule: all },
      { key: 'treatment', rule: all },
      { key: 'appointments', rule: { pick: 'nextAndRecent', next: 3, recent: 2 } },
      { key: 'contacts', rule: all },
    ],
  },
  {
    key: 'personal',
    audience: 'self',
    need: 'A personal overview',
    title: 'Personal overview',
    intro: 'An overview of my record, for my own use.',
    kind: 'summary',
    signature: false,
    sections: [
      { key: 'currentPosition' },
      { key: 'account' },
      { key: 'impact', rule: all },
      { key: 'changes', rule: newest(10) },
      { key: 'treatment', rule: all },
      { key: 'appointments', rule: newest(6) },
      { key: 'costSummary' },
    ],
  },
  {
    key: 'full-record',
    audience: 'self',
    need: 'Everything in my record',
    title: 'Full record',
    intro: 'Everything in my record except what I have marked private.',
    kind: 'evidence',
    signature: true,
    sections: [
      { key: 'account' },
      { key: 'chronology', rule: all },
      { key: 'injuries' },
      { key: 'work' },
      { key: 'impact', rule: all },
      { key: 'changes', rule: all },
      { key: 'treatment', rule: all },
      { key: 'appointments', rule: all },
      { key: 'costs', rule: all },
      { key: 'contacts', rule: all },
      { key: 'quickNotes', rule: all },
      { key: 'documents', rule: all },
    ],
  },
];

export function purposeByKey(key: string): Purpose | undefined {
  return purposes.find((p) => p.key === key);
}
