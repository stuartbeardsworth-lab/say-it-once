import { lockBackup, unlockBackup } from '../../crypto/backup';
import { checkPassphrase, generatePassphrase } from '../../crypto/passphrase';
import { secureRandom } from '../../crypto/random';
import { loadSodium } from '../../crypto/sodium';

// The app's side of locked backups: libsodium is loaded only when a backup
// is locked or unlocked, never at start-up.

export { isLockedBackup, lockedBackupCreatedAt } from '../../crypto/backup';

export async function lock(zip: Blob, password: string, createdAt: string): Promise<Blob> {
  const sodium = await loadSodium();
  return lockBackup(sodium, secureRandom(sodium), zip, password, createdAt);
}

export async function unlock(file: Blob, password: string): Promise<Blob> {
  const sodium = await loadSodium();
  return unlockBackup(sodium, file, password);
}

/** Four ordinary words, chosen at random on this device. */
export async function suggestPassword(): Promise<string> {
  const sodium = await loadSodium();
  return generatePassphrase(secureRandom(sodium));
}

/** What's wrong with a password, in plain words, or null if it will do. */
export function passwordProblem(password: string): string | null {
  const check = checkPassphrase(password);
  if (check.ok) return null;
  switch (check.reason) {
    case 'too-short':
      return 'Use at least 12 characters. Four ordinary words work well.';
    case 'too-common':
      return 'That password is too well known. Try four ordinary words instead.';
    case 'too-simple':
      return 'That’s too easy to guess. Try four ordinary words instead.';
  }
}

export function lockedBackupFileName(createdAt: string): string {
  return `Say It Once backup ${createdAt.slice(0, 10)} (locked).sayitonce`;
}
