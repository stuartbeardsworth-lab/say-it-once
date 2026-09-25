import type {
  Choice,
  ImpactAreaKey,
  SectionKey,
  appointmentTypes,
  costKinds,
  difficulties,
  effects,
  feelings,
  howOften,
  medicationStatuses,
  painLevels,
  yesNoNotSure,
} from './vocab';

// The raw record types: every item a person adds or edits on its own
// (docs/architecture.md, "Data model as encrypted items"). These still
// carry the private flag, so report code must never import them; the lint
// rule in eslint.config.js enforces that.
//
// Conventions: text and unmade choices are '' when empty; dates are
// 'YYYY-MM-DD' and times 'HH:MM', or '' when not given; money is whole
// pence; links to other items are item IDs, or null.

export interface ProfileData {
  personName: string;
}

export interface RecordMetaData {
  name: string;
  impactCurrentSince: string;
}

export interface IncidentData {
  date: string;
  time: string;
  place: string;
  before: string;
  what: string;
  after: string;
  told: string;
  injuries: string;
  witnesses: string;
  services: string;
  treatment: string;
  complications: string;
  ongoingCare: string;
}

export interface ImpactAreaData {
  areaKey: ImpactAreaKey;
  difficulty: Choice<typeof difficulties>;
  detail: string;
  help: string;
  aid: string;
  often: Choice<typeof howOften>;
  safety: string;
  timeLonger: string;
  standard: string;
}

export interface ImpactNoteData {
  text: string;
}

/** A copy of the impact position as it was, before "Something has changed". */
export interface ImpactSnapshotData {
  date: string;
  areas: { itemId: string; data: ImpactAreaData }[];
  note: { itemId: string; text: string } | null;
}

export interface CheckInData {
  date: string;
  pain: Choice<typeof painLevels>;
  feeling: Choice<typeof feelings>;
  /** Beats per minute, 20 to 250. */
  pulse: number | null;
  note: string;
}

export interface AppointmentData {
  date: string;
  time: string;
  organisation: string;
  person: string;
  purpose: string;
  location: string;
  type: Choice<typeof appointmentTypes>;
  told: string;
  next: string;
  /** The letter saved with this appointment. */
  documentId: string | null;
}

export interface TreatmentData {
  name: string;
  date: string;
  effect: Choice<typeof effects>;
  note: string;
}

export interface MedicationData {
  name: string;
  forWhat: string;
  status: Choice<typeof medicationStatuses>;
  dose: string;
  often: string;
  started: string;
  effect: Choice<typeof effects>;
  sideEffects: string;
}

export interface CostData {
  kind: (typeof costKinds)[number];
  date: string;
  /** Income lost only: the last day of the period. */
  dateTo: string;
  item: string;
  amountPence: number | null;
  evidence: string;
  documentId: string | null;
}

export interface StoredFileRef {
  fileId: string;
  name: string;
  type: string;
  size: number;
}

export interface DocumentData {
  title: string;
  from: string;
  date: string;
  point: string;
  wording: string;
  paperCopy: string;
  actBy: string;
  done: boolean;
  /** A section, and optionally one item in it. */
  relatedTo: { section: SectionKey; itemId: string | null } | null;
  file: StoredFileRef | null;
}

export interface ContactData {
  organisation: string;
  role: string;
  reference: string;
  phoneOrEmail: string;
}

export interface QuickNoteData {
  text: string;
  filedTo: { section: SectionKey; impactArea: ImpactAreaKey | 'other' | null } | null;
  photoFileId: string | null;
}

export interface WorkDetailsData {
  employer: string;
  workplace: string;
  jobTitle: string;
  employmentStart: string;
  employmentEnd: string;
  payrollRef: string;
  accidentReported: Choice<typeof yesNoNotSure>;
  reportedTo: string;
  reportDate: string;
  employmentSince: string;
}

export interface ItemDataMap {
  profile: ProfileData;
  recordMeta: RecordMetaData;
  incident: IncidentData;
  impactArea: ImpactAreaData;
  impactNote: ImpactNoteData;
  impactSnapshot: ImpactSnapshotData;
  checkIn: CheckInData;
  appointment: AppointmentData;
  treatment: TreatmentData;
  medication: MedicationData;
  cost: CostData;
  document: DocumentData;
  contact: ContactData;
  quickNote: QuickNoteData;
  workDetails: WorkDetailsData;
}

export type ItemType = keyof ItemDataMap;

export interface Item<T extends ItemType = ItemType> {
  id: string;
  /** null only for account-level items (the profile). */
  recordId: string | null;
  type: T;
  /** Payload version, for upgrading older items when they are read. */
  schema: number;
  private: boolean;
  data: ItemDataMap[T];
  createdAt: string;
  updatedAt: string;
}

export type AnyItem = { [T in ItemType]: Item<T> }[ItemType];

/** Item types that have a "Keep this private" control (decision Q13). */
export const privateCapable: ReadonlySet<ItemType> = new Set<ItemType>([
  'impactArea',
  'impactNote',
  'checkIn',
  'appointment',
  'treatment',
  'medication',
  'cost',
  'document',
  'contact',
  'quickNote',
]);

/** Item types with at most one per record (the profile: one per device for now). */
export const singletonTypes: ReadonlySet<ItemType> = new Set<ItemType>([
  'profile',
  'recordMeta',
  'incident',
  'impactNote',
  'workDetails',
]);

/** Current payload version of each type. Raise it with a migration in schema.ts. */
export const currentSchema: { readonly [T in ItemType]: number } = {
  profile: 1,
  recordMeta: 1,
  incident: 1,
  impactArea: 1,
  impactNote: 1,
  impactSnapshot: 1,
  checkIn: 1,
  appointment: 1,
  treatment: 1,
  medication: 1,
  cost: 1,
  document: 1,
  contact: 1,
  quickNote: 1,
  workDetails: 1,
};
