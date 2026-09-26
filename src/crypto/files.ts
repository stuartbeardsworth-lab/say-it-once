import { newKey, unwrapKey, wrapKey } from './aead';
import { bindingBytes, type Binding } from './binding';
import { CryptoProblem } from './problems';
import type { Random } from './random';
import type { Sodium } from './sodium';

// Files (docs/architecture.md, "Files and attachments"): each file has its
// own key, wrapped by the record key, and its contents are encrypted with
// libsodium's secretstream in 64 KiB pieces. A reordered, repeated, altered
// or cut-short file fails to open, rather than opening damaged. Only one
// piece is in memory at a time.

export const CHUNK_BYTES = 64 * 1024;

export interface FileAddress {
  accountId: string;
  recordId: string;
  fileId: string;
}

const binding = (a: FileAddress, purpose: 'file' | 'file-key'): Binding => ({
  purpose,
  accountId: a.accountId,
  recordId: a.recordId,
  objectId: a.fileId,
  version: 0,
});

export interface NewFileKey {
  fileKey: Uint8Array;
  wrappedKey: Uint8Array;
}

export function newFileKey(sodium: Sodium, random: Random, recordKey: Uint8Array, address: FileAddress): NewFileKey {
  const fileKey = newKey(random);
  return { fileKey, wrappedKey: wrapKey(sodium, random, fileKey, recordKey, binding(address, 'file-key')) };
}

export function openFileKey(sodium: Sodium, wrappedKey: Uint8Array, recordKey: Uint8Array, address: FileAddress): Uint8Array {
  return unwrapKey(sodium, wrappedKey, recordKey, binding(address, 'file-key'));
}

/** The pieces of a file's bytes, 64 KiB at a time, read as they're needed. */
export async function* chunksOf(file: Blob, size = CHUNK_BYTES): AsyncGenerator<Uint8Array> {
  if (file.size === 0) {
    yield new Uint8Array(0);
    return;
  }
  for (let start = 0; start < file.size; start += size) {
    yield new Uint8Array(await file.slice(start, start + size).arrayBuffer());
  }
}

/**
 * Encrypts a file. Yields the 24-byte header first, then one encrypted
 * piece per 64 KiB of the file (each 17 bytes longer). The last is marked
 * final, so a file cut short is detected.
 */
export async function* encryptFile(
  sodium: Sodium,
  file: Blob,
  fileKey: Uint8Array,
  address: FileAddress,
): AsyncGenerator<Uint8Array> {
  const ad = bindingBytes(binding(address, 'file'));
  const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(fileKey);
  yield header;
  let pending: Uint8Array | null = null;
  for await (const chunk of chunksOf(file)) {
    if (pending) yield sodium.crypto_secretstream_xchacha20poly1305_push(state, pending, ad, sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE);
    pending = chunk;
  }
  yield sodium.crypto_secretstream_xchacha20poly1305_push(state, pending ?? new Uint8Array(0), ad, sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL);
}

/**
 * Decrypts a file encrypted by encryptFile, given its header and encrypted
 * pieces in order. Throws 'failed-check' for any altered, reordered or
 * repeated piece, and 'truncated' if the final piece never arrives.
 */
export async function* decryptFile(
  sodium: Sodium,
  pieces: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
  fileKey: Uint8Array,
  address: FileAddress,
): AsyncGenerator<Uint8Array> {
  const ad = bindingBytes(binding(address, 'file'));
  let state: ReturnType<Sodium['crypto_secretstream_xchacha20poly1305_init_pull']> | null = null;
  let finished = false;
  for await (const piece of pieces) {
    if (finished) throw new CryptoProblem('failed-check', 'data after the final piece');
    if (!state) {
      if (piece.length !== sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES) throw new CryptoProblem('failed-check');
      try {
        state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(piece, fileKey);
      } catch {
        throw new CryptoProblem('failed-check');
      }
      continue;
    }
    let result: { message: Uint8Array; tag: number } | false;
    try {
      result = sodium.crypto_secretstream_xchacha20poly1305_pull(state, piece, ad);
    } catch {
      throw new CryptoProblem('failed-check');
    }
    if (!result) throw new CryptoProblem('failed-check');
    if (result.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL) finished = true;
    else if (result.tag !== sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE) throw new CryptoProblem('failed-check');
    yield result.message;
  }
  if (!finished) throw new CryptoProblem('truncated');
}

/** Splits an encrypted file (as stored) back into its header and pieces. */
export async function* piecesOf(sodium: Sodium, encrypted: Blob): AsyncGenerator<Uint8Array> {
  const headerBytes = sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  yield new Uint8Array(await encrypted.slice(0, headerBytes).arrayBuffer());
  yield* chunksOf(encrypted.slice(headerBytes), CHUNK_BYTES + sodium.crypto_secretstream_xchacha20poly1305_ABYTES);
}
