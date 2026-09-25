import type { FieldErrors } from '../domain/validate';

// Everything that can stop a save, in words for the person using the app.
// Each message says what happened and what to do about it.

export type StorageProblemKind = 'full' | 'blocked' | 'closed' | 'too-large' | 'unavailable' | 'unknown';

const messages: Record<StorageProblemKind, string> = {
  full: 'This device has run out of space. Free up some space, for example by deleting photos or apps you no longer need, then try again.',
  blocked:
    'This browser is not letting Say It Once keep anything. This can happen in a private window, or when website data is blocked in settings. Open Say It Once in a normal window, or allow website data, then reload the page.',
  closed:
    'The browser closed Say It Once’s storage. This sometimes happens when a phone is short of memory. Reload the page, then try again.',
  'too-large': 'This file is bigger than 25 MB, which is the most Say It Once can keep. Try a smaller photo or a shorter PDF.',
  unavailable:
    'Say It Once can’t save on this device at the moment, so nothing new can be kept. Your existing record has not been changed.',
  unknown: 'Something stopped Say It Once saving. Reload the page and try again.',
};

export class StorageProblem extends Error {
  readonly kind: StorageProblemKind;
  constructor(kind: StorageProblemKind, cause?: unknown) {
    super(messages[kind], { cause });
    this.name = 'StorageProblem';
    this.kind = kind;
  }
}

/** A save was refused because the entry isn't complete or isn't valid. */
export class ValidationProblem extends Error {
  readonly errors: FieldErrors;
  constructor(errors: FieldErrors) {
    super('Some details need checking before this can be saved.');
    this.name = 'ValidationProblem';
    this.errors = errors;
  }
}

function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const { name, inner } = error as { name?: unknown; inner?: unknown };
  // Dexie wraps the browser's error; the browser's name is the useful one.
  if (inner) return errorName(inner) || String(name ?? '');
  return typeof name === 'string' ? name : '';
}

/** Turns whatever the browser or Dexie threw into a StorageProblem. */
export function toStorageProblem(error: unknown): StorageProblem | ValidationProblem {
  if (error instanceof StorageProblem || error instanceof ValidationProblem) return error;
  switch (errorName(error)) {
    case 'QuotaExceededError':
      return new StorageProblem('full', error);
    case 'SecurityError':
    case 'MissingAPIError':
    case 'OpenFailedError':
    case 'InvalidAccessError':
      return new StorageProblem('blocked', error);
    case 'DatabaseClosedError':
    case 'InvalidStateError':
    case 'TransactionInactiveError':
    case 'AbortError':
      return new StorageProblem('closed', error);
    default:
      return new StorageProblem('unknown', error);
  }
}
