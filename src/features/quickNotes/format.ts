import type { QuickNoteData } from '../../domain/types';
import { impactAreaLabel, sectionLabels } from '../../domain/vocab';

export function whenSaved(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function whereFiled(filedTo: QuickNoteData['filedTo']): string {
  if (!filedTo) return 'Not filed yet';
  const section = sectionLabels[filedTo.section];
  if (filedTo.section === 'impact' && filedTo.impactArea) {
    return `Filed in ${section}: ${filedTo.impactArea === 'other' ? 'Something else' : impactAreaLabel(filedTo.impactArea)}`;
  }
  return `Filed in ${section}`;
}
