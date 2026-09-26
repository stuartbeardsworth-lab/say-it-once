import { newKey, unwrapKey, wrapKey } from './aead';
import type { Binding } from './binding';
import { derivePassphraseKey, newKdfParams, type KdfParams } from './passphrase';
import { CryptoProblem } from './problems';
import type { Random } from './random';
import { formatRecoveryKey, newRecoveryKey, parseRecoveryKey, recoveryWrappingKey } from './recoveryKey';
import type { Sodium } from './sodium';

// The account key and the ways to unlock it (docs/architecture.md, "Key
// hierarchy and cryptography"). One random account key unlocks everything.
// The passphrase and the recovery key each wrap a copy of it; changing
// either re-wraps that one small key and never re-encrypts any data.

export interface PassphraseWrap {
  kdf: KdfParams;
  wrapped: Uint8Array;
}

export interface RecoveryWrap {
  wrapped: Uint8Array;
}

export interface NewAccountKeys {
  accountKey: Uint8Array;
  passphraseWrap: PassphraseWrap;
  /** Shown once, on the recovery sheet, and never stored by the app. */
  recoveryKeyText: string;
  recoveryWrap: RecoveryWrap;
}

const accountBinding = (accountId: string, purpose: 'account-key/passphrase' | 'account-key/recovery'): Binding => ({
  purpose,
  accountId,
  recordId: null,
  objectId: accountId,
  version: 0,
});

export interface KdfSettings {
  opsLimit: number;
  memLimit: number;
  /** Tests only: allow settings below the app's floor, so they run quickly. */
  testOnly?: boolean;
}

export function wrapForPassphrase(
  sodium: Sodium,
  random: Random,
  accountKey: Uint8Array,
  passphrase: string,
  accountId: string,
  settings?: KdfSettings,
): PassphraseWrap {
  const kdf = newKdfParams(sodium, random, settings);
  const passphraseKey = derivePassphraseKey(sodium, passphrase, kdf, settings?.testOnly);
  try {
    return { kdf, wrapped: wrapKey(sodium, random, accountKey, passphraseKey, accountBinding(accountId, 'account-key/passphrase')) };
  } finally {
    sodium.memzero(passphraseKey);
  }
}

export function unlockWithPassphrase(sodium: Sodium, wrap: PassphraseWrap, passphrase: string, accountId: string, testOnly = false): Uint8Array {
  const passphraseKey = derivePassphraseKey(sodium, passphrase, wrap.kdf, testOnly);
  try {
    return unwrapKey(sodium, wrap.wrapped, passphraseKey, accountBinding(accountId, 'account-key/passphrase'));
  } catch (error) {
    if (error instanceof CryptoProblem && error.kind === 'failed-check') throw new CryptoProblem('wrong-passphrase');
    throw error;
  } finally {
    sodium.memzero(passphraseKey);
  }
}

/** A new recovery key for this account. Re-issuing replaces the old wrap, so the old key stops working. */
export function issueRecoveryKey(sodium: Sodium, random: Random, accountKey: Uint8Array, accountId: string): { recoveryKeyText: string; recoveryWrap: RecoveryWrap } {
  const recoveryKey = newRecoveryKey(random);
  const wrappingKey = recoveryWrappingKey(sodium, recoveryKey);
  try {
    return {
      recoveryKeyText: formatRecoveryKey(sodium, recoveryKey),
      recoveryWrap: { wrapped: wrapKey(sodium, random, accountKey, wrappingKey, accountBinding(accountId, 'account-key/recovery')) },
    };
  } finally {
    sodium.memzero(recoveryKey);
    sodium.memzero(wrappingKey);
  }
}

/** Unlocks with the recovery key as typed. A typo is reported before anything is tried. */
export function unlockWithRecoveryKey(sodium: Sodium, wrap: RecoveryWrap, typed: string, accountId: string): Uint8Array {
  const recoveryKey = parseRecoveryKey(sodium, typed);
  const wrappingKey = recoveryWrappingKey(sodium, recoveryKey);
  try {
    return unwrapKey(sodium, wrap.wrapped, wrappingKey, accountBinding(accountId, 'account-key/recovery'));
  } catch (error) {
    if (error instanceof CryptoProblem && error.kind === 'failed-check') throw new CryptoProblem('wrong-recovery-key');
    throw error;
  } finally {
    sodium.memzero(recoveryKey);
    sodium.memzero(wrappingKey);
  }
}

/** Everything made when sync is first turned on. */
export function createAccountKeys(
  sodium: Sodium,
  random: Random,
  passphrase: string,
  accountId: string,
  settings?: KdfSettings,
): NewAccountKeys {
  const accountKey = newKey(random);
  const passphraseWrap = wrapForPassphrase(sodium, random, accountKey, passphrase, accountId, settings);
  const { recoveryKeyText, recoveryWrap } = issueRecoveryKey(sodium, random, accountKey, accountId);
  return { accountKey, passphraseWrap, recoveryKeyText, recoveryWrap };
}

// ---- Record keys ------------------------------------------------------------

const recordBinding = (accountId: string, recordId: string): Binding => ({
  purpose: 'record-key',
  accountId,
  recordId,
  objectId: recordId,
  version: 0,
});

/** A new record's key, and its copy wrapped by the account key. */
export function newRecordKey(sodium: Sodium, random: Random, accountKey: Uint8Array, accountId: string, recordId: string): { recordKey: Uint8Array; wrapped: Uint8Array } {
  const recordKey = newKey(random);
  return { recordKey, wrapped: wrapKey(sodium, random, recordKey, accountKey, recordBinding(accountId, recordId)) };
}

export function openRecordKey(sodium: Sodium, wrapped: Uint8Array, accountKey: Uint8Array, accountId: string, recordId: string): Uint8Array {
  return unwrapKey(sodium, wrapped, accountKey, recordBinding(accountId, recordId));
}
