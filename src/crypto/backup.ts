import { bindingBytes } from './binding';
import { chunksOf, CHUNK_BYTES } from './files';
import { defaultKdf, derivePassphraseKey, newKdfParams, type KdfParams } from './passphrase';
import { CryptoProblem } from './problems';
import type { Random } from './random';
import type { Sodium } from './sodium';

// A locked backup (decided 27 September 2026): the ordinary backup zip,
// encrypted with a key made from a password the person chooses (Argon2id,
// the same settings as the passphrase), so the file can be kept in email or
// a cloud drive. Nobody, including Say It Once, can open it without the
// password.
//
// The file is:
//   "SAYITONCE-LOCKED-BACKUP\n"
//   4 bytes: the length of the header (big-endian)
//   the header, as JSON (format, what the file is, when it was made, the
//     Argon2id settings and salt). It is readable, and bound to the contents,
//     so changing it makes the file fail to open.
//   libsodium secretstream: a 24-byte header, then the zip in 64 KiB pieces,
//     the last marked final, so a file cut short or altered fails to open.

export const lockedBackupFormat = 1;
const magic = new TextEncoder().encode('SAYITONCE-LOCKED-BACKUP\n');

const about =
  'This is a locked Say It Once backup. It can only be opened in Say It Once, with the password chosen when it was made.';

interface Header {
  format: number;
  about: string;
  createdAt: string;
  kdf: { algorithm: 'argon2id13'; opsLimit: number; memLimit: number; salt: string };
}

function additionalData(headerText: string): Uint8Array {
  return bindingBytes({ purpose: 'backup', accountId: '', recordId: null, objectId: headerText, version: 0 });
}

/** Whether a file starts like a locked backup. */
export async function isLockedBackup(file: Blob): Promise<boolean> {
  const start = new Uint8Array(await file.slice(0, magic.length).arrayBuffer());
  return start.length === magic.length && start.every((b, i) => b === magic[i]);
}

/**
 * Locks a backup zip with a password. `settings` is for the tests, which
 * use small Argon2id settings so they run quickly; the app never passes it.
 */
export async function lockBackup(
  sodium: Sodium,
  random: Random,
  zip: Blob,
  password: string,
  createdAt: string,
  settings: { opsLimit: number; memLimit: number; testOnly?: boolean } = defaultKdf,
): Promise<Blob> {
  const kdf = newKdfParams(sodium, random, { opsLimit: settings.opsLimit, memLimit: settings.memLimit });
  const header: Header = {
    format: lockedBackupFormat,
    about,
    createdAt,
    kdf: { algorithm: kdf.algorithm, opsLimit: kdf.opsLimit, memLimit: kdf.memLimit, salt: sodium.to_base64(kdf.salt, sodium.base64_variants.ORIGINAL) },
  };
  const headerText = JSON.stringify(header);
  const headerBytes = new TextEncoder().encode(headerText);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, headerBytes.length);

  const key = derivePassphraseKey(sodium, password, kdf, settings.testOnly === true);
  const ad = additionalData(headerText);
  const { state, header: streamHeader } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
  const parts: Uint8Array[] = [magic, length, headerBytes, streamHeader];
  let pending: Uint8Array | null = null;
  for await (const chunk of chunksOf(zip)) {
    if (pending) parts.push(sodium.crypto_secretstream_xchacha20poly1305_push(state, pending, ad, sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE));
    pending = chunk;
  }
  parts.push(sodium.crypto_secretstream_xchacha20poly1305_push(state, pending ?? new Uint8Array(0), ad, sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL));
  sodium.memzero(key);
  return new Blob(parts as BlobPart[], { type: 'application/octet-stream' });
}

/** Reads a locked backup's header, or throws 'failed-check' if it isn't one or is damaged. */
async function readHeader(file: Blob): Promise<{ header: Header; headerText: string; bodyStart: number }> {
  if (!(await isLockedBackup(file))) throw new CryptoProblem('failed-check', 'not a locked backup');
  const lengthBytes = new Uint8Array(await file.slice(magic.length, magic.length + 4).arrayBuffer());
  if (lengthBytes.length !== 4) throw new CryptoProblem('failed-check');
  const length = new DataView(lengthBytes.buffer).getUint32(0);
  if (length > 4096) throw new CryptoProblem('failed-check');
  const start = magic.length + 4;
  const headerText = new TextDecoder().decode(await file.slice(start, start + length).arrayBuffer());
  let header: Header;
  try {
    header = JSON.parse(headerText) as Header;
  } catch {
    throw new CryptoProblem('failed-check');
  }
  if (typeof header.format !== 'number' || typeof header.kdf !== 'object' || header.kdf === null) throw new CryptoProblem('failed-check');
  if (header.format > lockedBackupFormat) throw new CryptoProblem('newer-format');
  return { header, headerText, bodyStart: start + length };
}

/** When a locked backup was made, read from its header without the password. */
export async function lockedBackupCreatedAt(file: Blob): Promise<string> {
  return (await readHeader(file)).header.createdAt;
}

/**
 * Unlocks a locked backup, giving back the zip. Throws 'wrong-passphrase'
 * when the password doesn't open it (a wrong password and a damaged start
 * look the same), 'failed-check' for damage further in, 'truncated' if it
 * was cut short, and 'newer-format' if a newer Say It Once made it.
 */
export async function unlockBackup(sodium: Sodium, file: Blob, password: string, allowTestSettings = false): Promise<Blob> {
  const { header, headerText, bodyStart } = await readHeader(file);
  let salt: Uint8Array;
  try {
    salt = sodium.from_base64(header.kdf.salt, sodium.base64_variants.ORIGINAL);
  } catch {
    throw new CryptoProblem('failed-check');
  }
  const kdf: KdfParams = { algorithm: header.kdf.algorithm, opsLimit: header.kdf.opsLimit, memLimit: header.kdf.memLimit, salt };
  const key = derivePassphraseKey(sodium, password, kdf, allowTestSettings);
  const ad = additionalData(headerText);

  const headerBytes = sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  const streamHeader = new Uint8Array(await file.slice(bodyStart, bodyStart + headerBytes).arrayBuffer());
  if (streamHeader.length !== headerBytes) throw new CryptoProblem('truncated');
  let state: ReturnType<Sodium['crypto_secretstream_xchacha20poly1305_init_pull']>;
  try {
    state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(streamHeader, key);
  } catch {
    throw new CryptoProblem('failed-check');
  } finally {
    sodium.memzero(key);
  }

  const out: Uint8Array[] = [];
  let first = true;
  let finished = false;
  const pieceBytes = CHUNK_BYTES + sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
  for await (const piece of chunksOf(file.slice(bodyStart + headerBytes), pieceBytes)) {
    if (finished) throw new CryptoProblem('failed-check', 'data after the final piece');
    let result: { message: Uint8Array; tag: number } | false;
    try {
      result = sodium.crypto_secretstream_xchacha20poly1305_pull(state, piece, ad);
    } catch {
      result = false;
    }
    if (!result) throw new CryptoProblem(first ? 'wrong-passphrase' : 'failed-check');
    first = false;
    if (result.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL) finished = true;
    else if (result.tag !== sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE) throw new CryptoProblem('failed-check');
    out.push(result.message);
  }
  if (!finished) throw new CryptoProblem('truncated');
  return new Blob(out as BlobPart[], { type: 'application/zip' });
}
