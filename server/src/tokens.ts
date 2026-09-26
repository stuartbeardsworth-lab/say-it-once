import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// Secrets the server hands out. Only their SHA-256 hashes are stored, so a
// copy of the database can't be used to sign in.

/** A 6-digit sign-in code, evenly spread over 000000–999999. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** A session token: 32 random bytes, base64url, kept only in the device's cookie. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(text: string): Buffer {
  return createHash('sha256').update(text).digest();
}

export function sameHash(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** For rate limits: who is asking, without storing the email or IP address itself. */
export function subjectOf(kind: string, value: string): string {
  return sha256(`${kind}:${value.toLowerCase()}`).toString('base64url');
}
