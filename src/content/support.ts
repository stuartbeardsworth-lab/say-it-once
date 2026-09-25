import raw from './support.json';

// The Find support content (decision Q16: content the operator edits, not
// code). The shape is checked by src/content/content.test.ts on every push.

export interface SupportContact {
  name: string;
  phone?: string;
  url?: string;
  description: string;
}

export interface SupportContent {
  lastChecked: string;
  urgent: SupportContact[];
  groups: { title: string; organisations: SupportContact[] }[];
}

export const support: SupportContent = raw;
