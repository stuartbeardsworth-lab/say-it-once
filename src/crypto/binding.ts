// What each ciphertext is bound to (docs/architecture.md, "Binding"). The
// binding is passed as associated data to every encryption, so a ciphertext
// only opens in exactly the place it was made for: the server can't swap one
// item's ciphertext for another's, move it to another record or account,
// replay an old version as new, or pass off a wrapped key as an item.

export type Purpose =
  /** An item's contents, sealed with its item key. */
  | 'item'
  /** An item key, wrapped by its record key. */
  | 'item-key'
  /** A file key, wrapped by its record key. */
  | 'file-key'
  /** A file's contents, in secretstream chunks sealed with its file key. */
  | 'file'
  /** A record key, wrapped by the account key. */
  | 'record-key'
  /** The account key, wrapped by the passphrase key. */
  | 'account-key/passphrase'
  /** The account key, wrapped by the recovery wrapping key. */
  | 'account-key/recovery'
  /** The account key, wrapped by this device's key. */
  | 'account-key/device';

export interface Binding {
  purpose: Purpose;
  accountId: string;
  /** Null for keys and items that belong to the account, not a record. */
  recordId: string | null;
  /** The item, file or record this is for; for account-key wraps, the account ID again. */
  objectId: string;
  /** The item's version; 0 where there are no versions (keys, files). */
  version: number;
}

/** Format version of the binding itself, so it can change later without ambiguity. */
const bindingFormat = 1;

/**
 * The bytes used as associated data. A JSON array of fixed order: simple to
 * write in any language, and unambiguous, since JSON escapes every field.
 */
export function bindingBytes(b: Binding): Uint8Array {
  if (!Number.isSafeInteger(b.version) || b.version < 0) throw new Error('version must be a whole number, 0 or more');
  return new TextEncoder().encode(
    JSON.stringify(['say-it-once', bindingFormat, b.purpose, b.accountId, b.recordId ?? '', b.objectId, b.version]),
  );
}
