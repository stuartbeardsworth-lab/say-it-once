import { bindingBytes, type Binding } from './binding';
import { CryptoProblem } from './problems';
import type { Random } from './random';
import type { Sodium } from './sodium';

// XChaCha20-Poly1305 (IETF), with a fresh random 192-bit nonce for every
// message: long enough that random nonces never repeat in practice.
// A sealed box is the nonce followed by the ciphertext and its 16-byte tag.

export const KEY_BYTES = 32;

export function seal(sodium: Sodium, random: Random, message: Uint8Array, key: Uint8Array, binding: Binding): Uint8Array {
  if (key.length !== KEY_BYTES) throw new Error('keys are 32 bytes');
  const nonce = random(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(message, bindingBytes(binding), null, nonce, key);
  const box = new Uint8Array(nonce.length + ciphertext.length);
  box.set(nonce);
  box.set(ciphertext, nonce.length);
  return box;
}

/** Opens a sealed box, or throws 'failed-check' if the key, binding or bytes are wrong. */
export function open(sodium: Sodium, box: Uint8Array, key: Uint8Array, binding: Binding): Uint8Array {
  const n = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  if (box.length < n + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES) throw new CryptoProblem('failed-check');
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, box.subarray(n), bindingBytes(binding), box.subarray(0, n), key);
  } catch {
    throw new CryptoProblem('failed-check');
  }
}

/** A new random 256-bit key. */
export function newKey(random: Random): Uint8Array {
  return random(KEY_BYTES);
}

/** Wraps (encrypts) one key with another. */
export function wrapKey(sodium: Sodium, random: Random, key: Uint8Array, wrappingKey: Uint8Array, binding: Binding): Uint8Array {
  if (key.length !== KEY_BYTES) throw new Error('keys are 32 bytes');
  return seal(sodium, random, key, wrappingKey, binding);
}

export function unwrapKey(sodium: Sodium, wrapped: Uint8Array, wrappingKey: Uint8Array, binding: Binding): Uint8Array {
  const key = open(sodium, wrapped, wrappingKey, binding);
  if (key.length !== KEY_BYTES) throw new CryptoProblem('failed-check');
  return key;
}
