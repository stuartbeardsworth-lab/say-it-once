import commonList from './data/common-passwords.txt?raw';
import wordList from './data/eff-large-wordlist.txt?raw';
import { CryptoProblem } from './problems';
import type { Random } from './random';
import type { Sodium } from './sodium';

// The passphrase (docs/architecture.md, "Passphrase rules", "Argon2id
// parameters"). It is turned into a key on the device with Argon2id and
// never leaves the device, in any form.

export interface KdfParams {
  algorithm: 'argon2id13';
  /** Passes over memory. */
  opsLimit: number;
  /** Memory, in bytes. */
  memLimit: number;
  /** 16 random bytes, per account, stored with the wrapped key. */
  salt: Uint8Array;
}

/** Starting point: 3 passes, 64 MiB. Checked on the slowest target phone to take under two seconds. */
export const defaultKdf = { opsLimit: 3, memLimit: 64 * 1024 * 1024 } as const;

/**
 * Limits on what this app will accept. The floor stops a weakened setting
 * being used by mistake; the ceiling stops a bad value freezing the phone.
 */
const limits = { minOps: 2, maxOps: 10, minMem: 32 * 1024 * 1024, maxMem: 256 * 1024 * 1024 };

export function newKdfParams(sodium: Sodium, random: Random, settings: { opsLimit: number; memLimit: number } = defaultKdf): KdfParams {
  return { algorithm: 'argon2id13', ...settings, salt: random(sodium.crypto_pwhash_SALTBYTES) };
}

/**
 * The same passphrase must give the same key on every phone. Unicode can
 * write some characters in more than one way (an accented letter as one
 * character or two), and phone keyboards differ, so the text is normalised
 * (NFKC) first. Nothing else is changed: spaces and capitals count.
 */
export function normalisePassphrase(passphrase: string): string {
  return passphrase.normalize('NFKC');
}

/**
 * The passphrase key. `allowTestSettings` lets the tests use small settings
 * so they run quickly; the app never passes it.
 */
export function derivePassphraseKey(sodium: Sodium, passphrase: string, params: KdfParams, allowTestSettings = false): Uint8Array {
  const floorOk = allowTestSettings || (params.opsLimit >= limits.minOps && params.memLimit >= limits.minMem);
  if (
    params.algorithm !== 'argon2id13' ||
    !floorOk ||
    params.opsLimit > limits.maxOps ||
    params.memLimit > limits.maxMem ||
    params.salt.length !== sodium.crypto_pwhash_SALTBYTES
  ) {
    throw new CryptoProblem('bad-parameters');
  }
  return sodium.crypto_pwhash(
    32,
    normalisePassphrase(passphrase),
    params.salt,
    params.opsLimit,
    params.memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

// ---- Rules ------------------------------------------------------------------

export const minimumLength = 12;

export type PassphraseCheck = { ok: true } | { ok: false; reason: 'too-short' | 'too-common' | 'too-simple' };

let common: Set<string> | null = null;
function commonPasswords(): Set<string> {
  common ??= new Set(commonList.split('\n').map((p) => p.trim().toLowerCase()).filter(Boolean));
  return common;
}

/**
 * At least 12 characters, not a well-known password (from the 10,000 most
 * common, including with numbers or symbols added at either end), and not
 * one character repeated or a simple run like "123456789012". Checked on the
 * device only.
 */
export function checkPassphrase(passphrase: string): PassphraseCheck {
  const text = normalisePassphrase(passphrase);
  const characters = [...text];
  if (characters.length < minimumLength) return { ok: false, reason: 'too-short' };
  const lower = text.toLowerCase();
  const squashed = lower.replace(/[\s\-_.]+/g, '');
  // A common password with numbers or symbols added at either end ("password1234!") is still common.
  const core = squashed.replace(/^[\d\W_]+|[\d\W_]+$/gu, '');
  if ([lower, squashed, core].some((p) => commonPasswords().has(p))) return { ok: false, reason: 'too-common' };
  if (new Set(characters).size <= 2) return { ok: false, reason: 'too-simple' };
  // Runs along the digits, the alphabet or a keyboard row, forwards or backwards, repeated.
  const runs = ['1234567890', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const isRun = runs.some((run) => {
    const long = run.repeat(Math.ceil(squashed.length / run.length) + 1);
    const reversed = [...long].reverse().join('');
    return long.includes(squashed) || reversed.includes(squashed);
  });
  if (isRun) return { ok: false, reason: 'too-simple' };
  return { ok: true };
}

// ---- Generated phrases --------------------------------------------------------

let words: string[] | null = null;
function wordlist(): string[] {
  words ??= wordList.split('\n').map((w) => w.trim()).filter(Boolean);
  if (words.length !== 7776) throw new Error('The word list is damaged');
  return words;
}

/**
 * Four words chosen at random from the EFF long word list (7,776 words), so
 * about 51.7 bits: plenty behind Argon2id, and easier to remember and type
 * than a string of symbols. Each word is picked without bias (rejection
 * sampling on two random bytes).
 */
export function generatePassphrase(random: Random, count = 4): string {
  const list = wordlist();
  const limit = Math.floor(65536 / list.length) * list.length;
  const chosen: string[] = [];
  while (chosen.length < count) {
    const bytes = random(2);
    const value = ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
    if (value < limit) chosen.push(list[value % list.length] ?? '');
  }
  return chosen.join(' ');
}
