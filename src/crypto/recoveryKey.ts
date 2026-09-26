import { CryptoProblem } from './problems';
import type { Random } from './random';
import type { Sodium } from './sodium';

// The recovery key (docs/architecture.md, "Recovery key format"): 256 random
// bits, written as 13 groups of 4 characters. 52 characters of 5 bits each
// hold 260 bits: the key, plus a 4-bit check that catches most typing
// mistakes before the key is tried. The alphabet leaves out 0, O, 1 and I,
// which are easily confused.

export const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const groups = 13;
const groupLength = 4;
const characters = groups * groupLength;

/** A new recovery key, as the 32 bytes of the key. */
export function newRecoveryKey(random: Random): Uint8Array {
  return random(32);
}

function check(sodium: Sodium, key: Uint8Array): number {
  return (sodium.crypto_generichash(32, key, null)[0] ?? 0) >> 4;
}

/** The key as people see it: "ABCD-EFGH-…", 13 groups. */
export function formatRecoveryKey(sodium: Sodium, key: Uint8Array): string {
  if (key.length !== 32) throw new Error('recovery keys are 32 bytes');
  // 256 key bits then 4 check bits, read 5 bits at a time.
  let bits = '';
  for (const byte of key) bits += byte.toString(2).padStart(8, '0');
  bits += check(sodium, key).toString(2).padStart(4, '0');
  let text = '';
  for (let i = 0; i < characters; i++) text += alphabet[parseInt(bits.slice(i * 5, i * 5 + 5), 2)];
  return (text.match(/.{4}/g) ?? []).join('-');
}

/**
 * Reads a recovery key as typed: spaces, dashes and small letters are fine.
 * A character that isn't used, a wrong length, or a failed check is reported
 * as 'recovery-key-typo', with which it was, before anything is unlocked.
 */
export function parseRecoveryKey(sodium: Sodium, typed: string): Uint8Array {
  const text = typed.toUpperCase().replace(/[\s-]+/g, '');
  const unused = [...text].find((c) => !alphabet.includes(c));
  if (unused) {
    throw new CryptoProblem(
      'recovery-key-typo',
      /[0O1I]/.test(unused) ? `The recovery key never uses “${unused}”.` : `“${unused}” isn’t part of a recovery key.`,
    );
  }
  if (text.length !== characters) {
    throw new CryptoProblem('recovery-key-typo', `A recovery key has ${characters} characters; this has ${text.length}.`);
  }
  let bits = '';
  for (const c of text) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  if (parseInt(bits.slice(256, 260), 2) !== check(sodium, key)) {
    throw new CryptoProblem('recovery-key-typo', 'One or more characters don’t match. Check each group.');
  }
  return key;
}

/**
 * The key that actually wraps the account key, derived from the recovery
 * key with libsodium's key derivation (BLAKE2b), so the recovery key itself
 * is only ever used for this one purpose.
 */
export function recoveryWrappingKey(sodium: Sodium, recoveryKey: Uint8Array): Uint8Array {
  return sodium.crypto_kdf_derive_from_key(32, 1, 'sio-recv', recoveryKey);
}
