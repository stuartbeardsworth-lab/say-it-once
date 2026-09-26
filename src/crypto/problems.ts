// Every way unlocking or opening can fail, named so the app can say plainly
// what happened. Nothing here ever says more than "it didn't match": no
// detail that would help someone guessing.

export type CryptoProblemKind =
  /** The passphrase doesn't unlock this account. */
  | 'wrong-passphrase'
  /** The recovery key is well formed but doesn't unlock this account. */
  | 'wrong-recovery-key'
  /** The recovery key has a typing mistake: see `detail`. */
  | 'recovery-key-typo'
  /** A key or envelope failed its check: wrong key, altered, swapped or replayed. */
  | 'failed-check'
  /** A file ended before its last piece. */
  | 'truncated'
  /** Made by a newer version of Say It Once. */
  | 'newer-format'
  /** Settings outside what this app accepts, such as absurd Argon2id limits. */
  | 'bad-parameters';

export class CryptoProblem extends Error {
  constructor(
    readonly kind: CryptoProblemKind,
    readonly detail = '',
  ) {
    super(detail ? `${kind}: ${detail}` : kind);
    this.name = 'CryptoProblem';
  }
}
