import type { ItemDataMap, ItemType } from './types';

// An empty entry of each type, as a new form starts. Used by forms (Stage 3)
// and tests, so every field always exists.

const blanks: { [T in ItemType]: () => ItemDataMap[T] } = {
  profile: () => ({ personName: '' }),
  recordMeta: () => ({ name: 'My record', impactCurrentSince: '' }),
  incident: () => ({
    date: '', time: '', place: '', before: '', what: '', after: '', told: '', injuries: '',
    witnesses: '', services: '', treatment: '', complications: '', ongoingCare: '',
  }),
  impactArea: () => ({
    areaKey: 'move', difficulty: '', detail: '', help: '', aid: '', often: '', safety: '', timeLonger: '', standard: '',
  }),
  impactNote: () => ({ text: '' }),
  impactSnapshot: () => ({ date: '', areas: [], note: null }),
  checkIn: () => ({ date: '', pain: '', feeling: '', pulse: null, note: '' }),
  appointment: () => ({
    date: '', time: '', organisation: '', person: '', purpose: '', location: '', type: '', told: '', next: '', documentId: null,
  }),
  treatment: () => ({ name: '', date: '', effect: '', note: '' }),
  medication: () => ({
    name: '', forWhat: '', status: '', dose: '', often: '', started: '', effect: '', sideEffects: '',
  }),
  cost: () => ({ kind: 'expense', date: '', dateTo: '', item: '', amountPence: null, evidence: '', documentId: null }),
  document: () => ({
    title: '', from: '', date: '', point: '', wording: '', paperCopy: '', actBy: '', done: false, relatedTo: null, file: null,
  }),
  contact: () => ({ organisation: '', role: '', reference: '', phoneOrEmail: '' }),
  quickNote: () => ({ text: '', filedTo: null, photoFileId: null }),
  workDetails: () => ({
    employer: '', workplace: '', jobTitle: '', employmentStart: '', employmentEnd: '', payrollRef: '',
    accidentReported: '', reportedTo: '', reportDate: '', employmentSince: '',
  }),
};

export function blank<T extends ItemType>(type: T, overrides: Partial<ItemDataMap[T]> = {}): ItemDataMap[T] {
  return { ...blanks[type](), ...overrides };
}
