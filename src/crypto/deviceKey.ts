import { bindingBytes } from './binding';
import { CryptoProblem } from './problems';

// The device key (docs/architecture.md, "Key hierarchy"): the one key that
// isn't libsodium's. It is made by the browser's own WebCrypto as a
// non-extractable AES-GCM key, so the browser will use it but never hand its
// bytes to anyone, including this app. It is kept in IndexedDB (Stage 9),
// and wraps the account key so a signed-in device opens without the
// passphrase. Signing a device out deletes it.

export async function newDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

const binding = (accountId: string) =>
  copy(bindingBytes({ purpose: 'account-key/device', accountId, recordId: null, objectId: accountId, version: 0 }));

/** WebCrypto wants bytes in their own plain ArrayBuffer. */
function copy(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

/** The account key wrapped by this device: a 12-byte random IV, then the ciphertext and tag. */
export async function wrapWithDeviceKey(deviceKey: CryptoKey, accountKey: Uint8Array, accountId: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: binding(accountId) }, deviceKey, copy(accountKey)),
  );
  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv);
  out.set(ciphertext, iv.length);
  return out;
}

export async function unwrapWithDeviceKey(deviceKey: CryptoKey, wrapped: Uint8Array, accountId: string): Promise<Uint8Array> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: copy(wrapped.subarray(0, 12)), additionalData: binding(accountId) },
      deviceKey,
      copy(wrapped.subarray(12)),
    );
    return new Uint8Array(plain);
  } catch {
    throw new CryptoProblem('failed-check');
  }
}
