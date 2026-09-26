# Say It Once: encryption design and implementation, for independent review

Version 1, 26 September 2026. Code: `src/crypto/`. Tests: `src/crypto/crypto.test.ts`.
Design background: `docs/architecture.md`, sections "Key hierarchy and
cryptography", "Account, sign-in, unlock and recovery", "Data model as
encrypted items", "Files and attachments", "Threat model".

## 1. What the product is, and what this protects

Say It Once is a record-keeping web app (a PWA) for people in the UK
recovering from serious injury or illness. They record what happened, how it
affects them, appointments, treatment, costs, letters and contacts. The data
is health and financial information about vulnerable people.

Today the app is device-only: data lives in IndexedDB in the browser and
never leaves the device. Stage 9 adds optional sync through our own server.
The requirement is **end-to-end encryption: the server stores ciphertext and
the minimum metadata, and never sees content, keys or anything derived from
the passphrase.**

This module is the whole of the client-side cryptography. It is built and
tested, but **not yet wired into the app** and no user data is encrypted with
it. We are asking for review before any user data is stored on the server.

## 2. Scope of the review

In scope:

- The design in this document.
- `src/crypto/*.ts` (about 800 lines, much of it comments): `binding.ts`, `aead.ts`, `items.ts`,
  `files.ts`, `passphrase.ts`, `recoveryKey.ts`, `account.ts`,
  `deviceKey.ts`, `random.ts`, `sodium.ts`, `problems.ts`, `selfCheck.ts`.
- The tests and test vectors in `src/crypto/crypto.test.ts` and
  `src/crypto/__snapshots__/crypto.test.ts.snap`.

Out of scope for now (built in Stages 8 to 9, and we'd welcome a second
review then): the server, the sync protocol, sessions, and how the client
stores keys and versions.

## 3. Primitives and library

- **libsodium** via `libsodium-wrappers-sumo` 0.8.4 (WebAssembly), loaded
  on demand. No custom primitives.
- **XChaCha20-Poly1305 (IETF)** for every piece of data and every key wrap,
  with a fresh random 192-bit nonce each time.
- **secretstream_xchacha20poly1305** for files, in 64 KiB chunks.
- **Argon2id** (`crypto_pwhash`, ALG_ARGON2ID13) for the passphrase.
- **BLAKE2b** (`crypto_kdf_derive_from_key`, `crypto_generichash`) for the
  recovery wrapping key and the recovery key's check bits.
- **WebCrypto AES-GCM-256** for the device key only, because only the
  browser can hold a key it will use but never export (non-extractable).
- Randomness: `randombytes_buf` (backed by `crypto.getRandomValues`), and
  `crypto.getRandomValues` for the device-key IV. `seededRandom` in
  `random.ts` exists only for test vectors and is never used by the app.

The site's Content-Security-Policy allows `'wasm-unsafe-eval'` for
WebAssembly; it does not allow `'unsafe-eval'` or inline scripts.

## 4. Key hierarchy

```
Passphrase ──Argon2id──▶ passphrase key ─┐
Recovery key ──KDF──▶ recovery wrapping key ─┼─▶ wraps ─▶ Account key (AMK, 256-bit random)
Device key (WebCrypto, non-extractable) ─┘                      │
                                                                ▼ wraps
                                                     Record key (per record)
                                                        │               │
                                                 wraps  ▼        wraps  ▼
                                   Item key (new on every save)   File key (per file)
```

| Key | Made | Kept | Wrapped by |
| --- | --- | --- | --- |
| Account key | When sync is first turned on | Server: passphrase-wrapped and recovery-wrapped copies. Device: device-wrapped copy | Passphrase key, recovery wrapping key, device key |
| Passphrase key | At each unlock | Never stored | (Argon2id) |
| Recovery key | With the account, or on reissue | Only on the person's printed or saved sheet | (random) |
| Device key | Per browser at sign-in | IndexedDB, as a non-extractable CryptoKey | (random) |
| Record key | Per record | Server and device, wrapped | Account key |
| Item key | On every save of an item | Inside the item envelope, wrapped | Record key |
| File key | Per file | With the file, wrapped | Record key |

Changing the passphrase or reissuing the recovery key re-wraps the account
key only; no data is re-encrypted. Reissuing the recovery key replaces the
server's recovery-wrapped copy, so the old key stops working.

## 5. Formats

### 5.1 Sealed box

`seal()` in `aead.ts` returns `nonce (24 bytes) || ciphertext || tag (16 bytes)`.
Key wraps use the same format with a 32-byte plaintext.

### 5.2 Binding (associated data)

Every seal, every wrap and every file chunk has associated data that binds it
to its place (`binding.ts`):

```
UTF-8 of JSON.stringify(["say-it-once", 1, purpose, accountId, recordId or "", objectId, version])
```

`purpose` is one of `item`, `item-key`, `file-key`, `file`, `record-key`,
`account-key/passphrase`, `account-key/recovery`, `account-key/device`. The
fixed-order JSON array is unambiguous (every field is JSON-escaped) and easy
to reproduce in another language.

Intended effect: the server can't swap one item's ciphertext for another's,
move an item between records or accounts, present an old version as a newer
one, or pass a wrapped key off as an item or vice versa.

### 5.3 Items

`sealItem()` in `items.ts`:

1. A new random item key.
2. Plaintext = `sodium.pad(UTF-8(JSON(payload)), 512)` (ISO/IEC 7816-4 padding),
   where payload = `{schema, type, data, private, createdAt, updatedAt}`. The
   item's type is inside, so the server can't count kinds of entry.
3. `ciphertext = seal(plaintext, itemKey, binding(item, version))`.
4. `wrappedKey = seal(itemKey, recordKey, binding(item-key, version))`.
5. The item key is zeroed.

The server stores `item_id, account_id, record_id, version, deleted,
wrapped_key, ciphertext, updated_at, written_by`.

**Version in the binding.** The client seals with the version the write
will have once accepted (its base version + 1). If the server rejects the
write because the base version is stale, the client re-seals after resolving
the conflict. So a ciphertext is only valid at exactly one version.

### 5.4 Files

`files.ts`: a random file key per file, wrapped by the record key
(`file-key`). The contents are a secretstream: a 24-byte header, then one
encrypted chunk per 64 KiB of plaintext (each 17 bytes longer), the last
tagged `TAG_FINAL`. Every chunk carries the `file` binding as associated
data. Decryption fails on any altered, reordered, repeated or extra chunk,
and reports `truncated` if no final chunk arrives. An empty file is a single
empty final chunk. Only one chunk is held in memory at a time.

### 5.5 Passphrase

`passphrase.ts`:

- Normalised with Unicode NFKC before hashing, so the same passphrase gives
  the same key whichever phone keyboard typed it. Nothing else changes (case
  and spaces count).
- Argon2id with a random 16-byte salt per account (new salt on each
  passphrase change), 32-byte output.
- Settings stored with the wrap: `{algorithm: 'argon2id13', opsLimit,
  memLimit, salt}`. The app's default is **3 passes, 64 MiB**. It is checked
  on real phones with the review page's speed check, with a target of under
  two seconds on the slowest supported phone.
- Accepted range when unlocking: 2 to 10 passes and 32 to 256 MiB. Anything
  outside is refused (`bad-parameters`): the floor stops a weakened setting
  being used by mistake, and the ceiling stops a bad value freezing the
  phone. The tests alone may go below the floor, through an explicit flag.
- Rules (checked on the device only): at least 12 characters (code points
  after NFKC). Refused if it is in the 10,000 most common passwords
  (SecLists, MIT licence), including with digits or symbols added at either
  end or spaces removed. Also refused if it uses only one or two different
  characters, or is a run along the digits, the alphabet or a keyboard row.
- Suggested passphrase: four words from the EFF long word list (7,776 words,
  about 51.7 bits), chosen with rejection sampling to avoid bias.

### 5.6 Recovery key

`recoveryKey.ts`:

- 32 random bytes.
- Shown as 13 groups of 4 characters from the 32-character alphabet
  `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (no 0, O, 1, I). That is 52 characters
  × 5 bits = 260 bits: the 256 key bits, then a 4-bit check (the high 4
  bits of BLAKE2b-256 of the key).
- Parsing accepts lower case, spaces and dashes. It reports an unused
  character, a wrong length, or a failed check before anything is tried. The
  check catches a single wrong character about 15 times in 16.
- The key that wraps the account key is
  `crypto_kdf_derive_from_key(32, 1, "sio-recv", recoveryKey)`, so the
  recovery key itself is used for nothing else.

### 5.7 Device key

`deviceKey.ts`: AES-GCM-256, generated with `extractable: false`, usages
encrypt and decrypt. The account key is wrapped as `IV (12 random bytes) ||
ciphertext || tag`, with the `account-key/device` binding as additional data.
In Stage 9 the CryptoKey is stored in IndexedDB (structured clone), and
signing the device out deletes it.

## 6. Test vectors

`src/crypto/crypto.test.ts`, "test vectors": fixed inputs and a seeded random
source give fixed outputs. They are recorded in
`src/crypto/__snapshots__/crypto.test.ts.snap`:

- account key;
- salt;
- passphrase-wrapped and recovery-wrapped account key;
- recovery key text;
- record key and its wrap;
- a sealed item;
- a file key and its wrap.

They use small Argon2id settings (1 pass, 8 MiB) so they run quickly; the
note in the file says so. Any change to a format, binding or algorithm
changes them and fails the test. A second implementation (for example
server-side checks, or another client) can be tested against them.

The suite also checks libsodium against the published XChaCha20-Poly1305 test
vector (draft-irtf-cfrg-xchacha, appendix A.3.1).

Run the tests: `npm ci`, then `npx vitest run src/crypto`. In a browser, the
review page's "How fast is this phone?" runs a real unlock and a round trip
under the site's CSP (Deploy Previews only; `e2e/stage7.spec.ts`).

## 7. What the tests prove

- Items: round trip; padding to 512-byte blocks; refusal when the item ID,
  record ID, account ID or version differs (both newer and older); refusal
  with another record's key, and when a wrapped key and ciphertext from two
  items are mixed; a new item key on every save.
- Seal: refusal of every single-bit flip in a sealed box, a different key,
  every field of the binding changed, and a shortened box.
- Files (0 B, 1 B, exactly 64 KiB, 64 KiB + 1, about 200 KB): round trip; refusal
  of reordered, repeated, altered and dropped chunks, a wrong file ID, and
  a missing final chunk (`truncated`).
- Passphrase: rules; NFKC equivalence; limits on settings.
- Recovery key: format, round trip, tolerant parsing, typo detection.
- Account key: unlock by passphrase and by recovery key; refusal of a wrong
  passphrase, a wrong account ID and another account's recovery key; change
  of passphrase and reissue of recovery key; record keys bound to their
  record.
- Device key: not extractable; round trip; refusal with another account ID
  or another device key.

## 8. Known limits, and questions for the reviewer

1. **Offline guessing after a server breach.** Someone holding the server's
   data gets each account's salt, Argon2id settings and passphrase-wrapped
   account key, and can guess passphrases offline at Argon2id's cost. Are 3
   passes and 64 MiB, a 12-character minimum and the common-password check
   enough for this audience? Should we raise the minimum, or require the
   generated phrase?
2. **The recovery key's check is 4 bits.** It catches most single-character
   mistakes, not all; a wrong key then fails as "doesn't unlock". Is a
   longer key with a stronger check worth the extra typing?
3. **Random nonces for key wraps.** Every wrap uses a random 192-bit nonce.
   We believe this is sound for XChaCha20-Poly1305 at our volumes.
4. **The version is chosen by the client.** See 5.3. The binding stops a
   ciphertext being presented at any other version. Rolling an item back to
   an older (version, ciphertext) pair, or withholding items, is detected by
   the client tracking the highest version it has seen (Stage 9), not by
   this module.
5. **Metadata the server sees.** Account, record and item IDs; item count
   per record; versions and write times; which device wrote; padded item
   sizes (to 512 bytes); exact file sizes. Is 512-byte padding reasonable?
6. **Device key and XSS.** A non-extractable key can't be copied out, but a
   script running in the page could still ask the browser to use it. The
   defence is the CSP (no third-party or inline scripts) and dependency
   hygiene. Anything else you'd add?
7. **Wiping memory.** Keys in `Uint8Array`s are zeroed after use
   (`memzero`), but JavaScript can't reliably wipe copies, and strings (the
   passphrase, the recovery key text) can't be wiped at all.
8. **NFKC normalisation.** Could it merge passphrases that should be
   different, in a way that matters?
9. **Deletion.** Deleting data means deleting the envelopes and file chunks
   and their wrapped keys on the server; there is no crypto-shredding of
   record keys yet. Would re-keying a record on deletion of sensitive items be
   worth it?
10. **libsodium build.** We use the sumo build from npm (0.8.4) and load it
    as a module. Any concerns about the WebAssembly build, or `'wasm-unsafe-eval'`?

## 9. Contact

Questions to the project owner. Please report findings as issues or in a
written report, ranked by severity.
