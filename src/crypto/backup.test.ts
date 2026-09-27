// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { isLockedBackup, lockBackup, lockedBackupCreatedAt, unlockBackup } from './backup';
import { CryptoProblem } from './problems';
import { secureRandom, type Random } from './random';
import { loadSodium, type Sodium } from './sodium';

// Locked backups: what should open opens, and a wrong password, a changed
// header, a cut-short or altered file is refused, never opened damaged.

let sodium: Sodium;
let random: Random;
beforeAll(async () => {
  sodium = await loadSodium();
  random = secureRandom(sodium);
});

// Small Argon2id settings so the tests run quickly. The app never uses these.
const fast = { opsLimit: 1, memLimit: 8 * 1024 * 1024, testOnly: true };
const createdAt = '2026-09-27T20:00:00.000Z';
const password = 'correct horse battery staple';

/** A pretend zip, bigger than one 64 KiB piece so several pieces are made. */
function zipOf(size: number): Blob {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = (i * 31 + 7) % 251;
  bytes[0] = 0x50;
  bytes[1] = 0x4b;
  return new Blob([bytes]);
}

async function bytesOf(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function expectProblem(promise: Promise<unknown>, kind: CryptoProblem['kind']) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(CryptoProblem);
  expect((error as CryptoProblem).kind).toBe(kind);
}

describe('locked backups', () => {
  it('open with the right password, giving back exactly the same zip', async () => {
    for (const size of [0, 10, 64 * 1024, 200_000]) {
      const zip = zipOf(size);
      const locked = await lockBackup(sodium, random, zip, password, createdAt, fast);
      expect(await isLockedBackup(locked)).toBe(true);
      expect(await lockedBackupCreatedAt(locked)).toBe(createdAt);
      const opened = await unlockBackup(sodium, locked, password, true);
      expect(await bytesOf(opened)).toEqual(await bytesOf(zip));
    }
  });

  it('don’t contain the backup’s words, and differ every time', async () => {
    const words = new TextEncoder().encode('Saw the GP about my knee. Private: worried about money.');
    const zip = new Blob([words]);
    const a = await bytesOf(await lockBackup(sodium, random, zip, password, createdAt, fast));
    const b = await bytesOf(await lockBackup(sodium, random, zip, password, createdAt, fast));
    expect(new TextDecoder().decode(a)).not.toContain('worried about money');
    expect(a).not.toEqual(b);
  });

  it('refuse a wrong password', async () => {
    const locked = await lockBackup(sodium, random, zipOf(1000), password, createdAt, fast);
    await expectProblem(unlockBackup(sodium, locked, 'correct horse battery stapler', true), 'wrong-passphrase');
  });

  it('refuse a file whose readable header was changed', async () => {
    const locked = await bytesOf(await lockBackup(sodium, random, zipOf(1000), password, createdAt, fast));
    const text = new TextDecoder('latin1').decode(locked);
    const at = text.indexOf('2026-09-27');
    const changed = locked.slice();
    changed[at + 3] = '5'.charCodeAt(0); // 2026 → 2025
    await expectProblem(unlockBackup(sodium, new Blob([changed]), password, true), 'wrong-passphrase');
  });

  it('refuse a file that was altered, cut short or added to', async () => {
    const locked = await bytesOf(await lockBackup(sodium, random, zipOf(200_000), password, createdAt, fast));

    const altered = locked.slice();
    altered[altered.length - 100] = (altered[altered.length - 100] ?? 0) ^ 1;
    await expectProblem(unlockBackup(sodium, new Blob([altered]), password, true), 'failed-check');

    const piece = 64 * 1024 + sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
    const lastPiece = (200_000 % (64 * 1024)) + sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
    await expectProblem(unlockBackup(sodium, new Blob([locked.slice(0, locked.length - lastPiece)]), password, true), 'truncated');
    expect(piece).toBeGreaterThan(lastPiece);

    const extra = new Uint8Array(locked.length + 40);
    extra.set(locked);
    await expectProblem(unlockBackup(sodium, new Blob([extra]), password, true), 'failed-check');
  });

  it('say when a newer Say It Once made the file', async () => {
    const locked = await bytesOf(await lockBackup(sodium, random, zipOf(10), password, createdAt, fast));
    const text = new TextDecoder('latin1').decode(locked);
    const at = text.indexOf('"format":1');
    const changed = locked.slice();
    changed[at + '"format":'.length] = '9'.charCodeAt(0);
    await expectProblem(unlockBackup(sodium, new Blob([changed]), password, true), 'newer-format');
  });

  it('refuse weakened Argon2id settings in the app', async () => {
    const locked = await lockBackup(sodium, random, zipOf(10), password, createdAt, fast);
    await expectProblem(unlockBackup(sodium, locked, password), 'bad-parameters');
  });

  it('are told apart from an ordinary backup zip', async () => {
    expect(await isLockedBackup(zipOf(100))).toBe(false);
    expect(await isLockedBackup(new Blob([]))).toBe(false);
  });
});
