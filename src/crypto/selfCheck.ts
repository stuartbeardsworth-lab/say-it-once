import { createAccountKeys, newRecordKey, unlockWithPassphrase } from './account';
import { openItem, sealItem } from './items';
import { defaultKdf } from './passphrase';
import { secureRandom } from './random';
import { loadSodium } from './sodium';

// "How fast is this phone?" on the review page: times one passphrase
// unlock with the real settings (3 passes, 64 MiB), and checks a full round
// trip works on this device. Used to confirm the settings on the slowest
// phone we support (docs/architecture.md, "Argon2id parameters").

export interface SelfCheckResult {
  /** Time to turn the passphrase into a key once, in milliseconds. */
  unlockMs: number;
  opsLimit: number;
  memLimitMiB: number;
  /** Whether sealing and opening an item round-tripped exactly. */
  roundTrip: boolean;
}

export async function runSelfCheck(): Promise<SelfCheckResult> {
  const sodium = await loadSodium();
  const random = secureRandom(sodium);
  const keys = createAccountKeys(sodium, random, 'a passphrase for the speed check', 'check-account', defaultKdf);
  const start = performance.now();
  const accountKey = unlockWithPassphrase(sodium, keys.passphraseWrap, 'a passphrase for the speed check', 'check-account');
  const unlockMs = performance.now() - start;
  const record = newRecordKey(sodium, random, accountKey, 'check-account', 'check-record');
  const address = { accountId: 'check-account', recordId: 'check-record', itemId: 'check-item', version: 1 };
  const payload = { schema: 1, type: 'quickNote', data: { text: 'Speed check' }, private: false, createdAt: '', updatedAt: '' };
  const back = openItem(sodium, sealItem(sodium, random, payload, record.recordKey, address), record.recordKey, address);
  return {
    unlockMs,
    opsLimit: defaultKdf.opsLimit,
    memLimitMiB: defaultKdf.memLimit / (1024 * 1024),
    roundTrip: JSON.stringify(back) === JSON.stringify(payload),
  };
}
