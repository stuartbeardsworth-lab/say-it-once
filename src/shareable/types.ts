import type {
  AppointmentData,
  CheckInData,
  ContactData,
  CostData,
  DocumentData,
  ImpactAreaData,
  ImpactNoteData,
  ImpactSnapshotData,
  IncidentData,
  MedicationData,
  QuickNoteData,
  TreatmentData,
  WorkDetailsData,
} from '../domain/types';

// Report code gets the entry shapes from here, never from src/domain/types.
export type {
  AppointmentData,
  CheckInData,
  ContactData,
  CostData,
  DocumentData,
  ImpactAreaData,
  ImpactNoteData,
  ImpactSnapshotData,
  IncidentData,
  MedicationData,
  QuickNoteData,
  TreatmentData,
  WorkDetailsData,
};

// The shareable view (docs/architecture.md, "Privacy filter"). This is the
// only shape report code ever receives. It has no `private` field anywhere:
// private entries are simply not in it, so there is nothing to forget to
// check. Only toShareable() makes one.

export interface ShareableEntry<D> {
  id: string;
  data: D;
  createdAt: string;
  updatedAt: string;
}

export interface ShareableRecord {
  /** Marks the type as coming from toShareable, so a raw record can't pose as one. */
  readonly kind: 'shareable';
  recordId: string;
  recordName: string;
  personName: string;
  impactCurrentSince: string;
  incident: IncidentData | null;
  workDetails: WorkDetailsData | null;
  impactAreas: ShareableEntry<ImpactAreaData>[];
  impactNote: ShareableEntry<ImpactNoteData> | null;
  snapshots: ShareableEntry<ImpactSnapshotData>[];
  checkIns: ShareableEntry<CheckInData>[];
  appointments: ShareableEntry<AppointmentData>[];
  treatments: ShareableEntry<TreatmentData>[];
  medications: ShareableEntry<MedicationData>[];
  costs: ShareableEntry<CostData>[];
  documents: ShareableEntry<DocumentData>[];
  contacts: ShareableEntry<ContactData>[];
  quickNotes: ShareableEntry<QuickNoteData>[];
}

/**
 * How many private entries were left out, by kind. Shown in the app ("4
 * private items are not included"), never in an output, so it holds counts
 * only: no titles or text.
 */
export interface ExcludedSummary {
  total: number;
  byKind: Partial<Record<string, number>>;
}
