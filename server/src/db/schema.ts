import type { ColumnType, Generated } from 'kysely';

// The database's tables, as TypeScript types for Kysely. The server only
// ever holds ciphertext: item contents, keys and files are all encrypted on
// the person's device before they arrive (docs/architecture.md, "Data model
// as encrypted items"). What it can see is listed in the threat model:
// email address, IDs, versions, sizes and times.

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface Database {
  accounts: AccountsTable;
  signInCodes: SignInCodesTable;
  rateEvents: RateEventsTable;
  devices: DevicesTable;
  sessions: SessionsTable;
  accountKeys: AccountKeysTable;
  recordKeys: RecordKeysTable;
  items: ItemsTable;
  pushRequests: PushRequestsTable;
  files: FilesTable;
  fileChunks: FileChunksTable;
}

export interface AccountsTable {
  id: string;
  /** Lower-cased. */
  email: string;
  /** Last change sequence number handed out to this account's items. */
  lastSeq: ColumnType<string, string | undefined, string>;
  plan: ColumnType<string, string | undefined, string>;
  createdAt: Timestamp;
}

export interface SignInCodesTable {
  id: Generated<string>;
  email: string;
  /** SHA-256 of the code; the code itself is never stored. */
  codeHash: Buffer;
  attempts: ColumnType<number, number | undefined, number>;
  expiresAt: Timestamp;
  usedAt: ColumnType<Date | null, null | undefined, Date>;
  createdAt: Timestamp;
}

export interface RateEventsTable {
  id: Generated<string>;
  /** What is being limited, e.g. "code-email" or "code-ip". */
  kind: string;
  /** Who: an email address or IP address, hashed. */
  subject: string;
  at: Timestamp;
}

export interface DevicesTable {
  id: string;
  accountId: string;
  name: string;
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
  /** Set when signed out from another device: it wipes itself when it next connects. */
  signedOutAt: ColumnType<Date | null, null | undefined, Date | null>;
}

export interface SessionsTable {
  /** SHA-256 of the session token; the token itself only lives in the cookie. */
  tokenHash: Buffer;
  accountId: string;
  deviceId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  lastSeenAt: Timestamp;
}

export interface AccountKeysTable {
  accountId: string;
  passphraseWrap: Buffer;
  /** Argon2id settings and salt, as the client sent them: {opsLimit, memLimit, salt}. */
  kdf: ColumnType<unknown, string, string>;
  recoveryWrap: Buffer;
  version: number;
  updatedAt: Timestamp;
}

export interface RecordKeysTable {
  accountId: string;
  recordId: string;
  wrapped: Buffer;
  createdAt: Timestamp;
}

export interface ItemsTable {
  accountId: string;
  itemId: string;
  /** Null for account-level items such as the profile. */
  recordId: string | null;
  version: number;
  deleted: boolean;
  /** Null once deleted (a tombstone keeps no key or ciphertext). */
  wrappedKey: Buffer | null;
  ciphertext: Buffer | null;
  /** Account-wide change order, for pulling changes since a cursor. */
  seq: string;
  writtenBy: string;
  updatedAt: Timestamp;
}

export interface PushRequestsTable {
  accountId: string;
  requestId: string;
  response: ColumnType<unknown, string, string>;
  createdAt: Timestamp;
}

export interface FilesTable {
  accountId: string;
  fileId: string;
  recordId: string;
  wrappedKey: Buffer;
  chunkCount: number;
  totalSize: string;
  complete: boolean;
  createdAt: Timestamp;
}

export interface FileChunksTable {
  fileId: string;
  n: number;
  data: Buffer;
}
