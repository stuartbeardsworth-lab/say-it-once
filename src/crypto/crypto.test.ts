// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { createAccountKeys, issueRecoveryKey, newRecordKey, openRecordKey, unlockWithPassphrase, unlockWithRecoveryKey, wrapForPassphrase } from './account';
import { open, seal } from './aead';
import type { Binding } from './binding';
import { newDeviceKey, unwrapWithDeviceKey, wrapWithDeviceKey } from './deviceKey';
import { decryptFile, encryptFile, newFileKey, openFileKey, piecesOf } from './files';
import { openItem, sealItem, type ItemAddress, type ItemPayload } from './items';
import { checkPassphrase, derivePassphraseKey, generatePassphrase, newKdfParams } from './passphrase';
import { CryptoProblem } from './problems';
import { secureRandom, seededRandom, type Random } from './random';
import { alphabet, formatRecoveryKey, parseRecoveryKey } from './recoveryKey';
import { loadSodium, type Sodium } from './sodium';

// The encryption module's tests (docs/crypto-review.md). Every piece is
// checked both ways: what should open opens, and anything wrong, swapped,
// altered, replayed or cut short is refused.

let sodium: Sodium;
let random: Random;
beforeAll(async () => {
  sodium = await loadSodium();
  random = secureRandom(sodium);
});

// Small Argon2id settings so the tests run quickly. The app never uses these.
const fast = { opsLimit: 1, memLimit: 8 * 1024 * 1024, testOnly: true };

const hex = (h: string) => Uint8Array.from((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));

function expectProblem(fn: () => unknown, kind: CryptoProblem['kind']) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CryptoProblem);
    expect((error as CryptoProblem).kind).toBe(kind);
    return;
  }
  throw new Error(`expected ${kind}, but nothing went wrong`);
}

async function expectProblemAsync(fn: () => Promise<unknown>, kind: CryptoProblem['kind']) {
  await expect(fn()).rejects.toMatchObject({ kind });
}

describe('libsodium itself', () => {
  it('matches the published XChaCha20-Poly1305 test vector (draft-irtf-cfrg-xchacha, A.3.1)', () => {
    const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.",
      hex('50515253c0c1c2c3c4c5c6c7'),
      null,
      hex('404142434445464748494a4b4c4d4e4f5051525354555657'),
      hex('808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f'),
    );
    expect(sodium.to_hex(ct)).toBe(
      'bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb731c7f1b0b4aa6440bf3a82f4eda7e39ae64c6708c54c216cb96b72e1213b4522f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff921f9664c97637da9768812f615c68b13b52e' +
        'c0875924c1c7987947deafd8780acf49',
    );
  });
});

describe('sealing with a binding', () => {
  const b: Binding = { purpose: 'item', accountId: 'acct', recordId: 'rec', objectId: 'item', version: 3 };

  it('opens with the same key and binding, and never repeats a nonce', () => {
    const key = sodium.randombytes_buf(32);
    const a = seal(sodium, random, new TextEncoder().encode('hello'), key, b);
    const c = seal(sodium, random, new TextEncoder().encode('hello'), key, b);
    expect(new TextDecoder().decode(open(sodium, a, key, b))).toBe('hello');
    expect(sodium.to_hex(a)).not.toBe(sodium.to_hex(c));
  });

  it('refuses a different key, any change to the binding, and any changed byte', () => {
    const key = sodium.randombytes_buf(32);
    const box = seal(sodium, random, new TextEncoder().encode('hello'), key, b);
    expectProblem(() => open(sodium, box, sodium.randombytes_buf(32), b), 'failed-check');
    for (const change of [
      { accountId: 'other' },
      { recordId: 'other' },
      { recordId: null },
      { objectId: 'other' },
      { version: 4 },
      { purpose: 'item-key' as const },
    ]) {
      expectProblem(() => open(sodium, box, key, { ...b, ...change }), 'failed-check');
    }
    for (let i = 0; i < box.length; i++) {
      const bent = box.slice();
      bent[i] = (bent[i] ?? 0) ^ 1;
      expectProblem(() => open(sodium, bent, key, b), 'failed-check');
    }
    expectProblem(() => open(sodium, box.subarray(0, 30), key, b), 'failed-check');
  });
});

describe('items', () => {
  const address: ItemAddress = { accountId: 'acct', recordId: 'rec', itemId: 'item-1', version: 7 };
  const payload: ItemPayload = {
    schema: 1,
    type: 'appointment',
    data: { organisation: 'Fracture clinic', told: 'The bone is healing.' },
    private: false,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-02T10:00:00.000Z',
  };

  it('opens as it was sealed', () => {
    const recordKey = sodium.randombytes_buf(32);
    expect(openItem(sodium, sealItem(sodium, random, payload, recordKey, address), recordKey, address)).toEqual(payload);
  });

  it('pads contents to a multiple of 512 bytes, so a short note and a longer one look the same', () => {
    const recordKey = sodium.randombytes_buf(32);
    const short = sealItem(sodium, random, { ...payload, data: { text: 'hi' } }, recordKey, address);
    const longer = sealItem(sodium, random, { ...payload, data: { text: 'x'.repeat(300) } }, recordKey, address);
    const overhead = 24 + 16;
    expect((short.ciphertext.length - overhead) % 512).toBe(0);
    expect(short.ciphertext.length).toBe(longer.ciphertext.length);
  });

  it('can’t be moved to another item, record or account, or replayed as another version', () => {
    const recordKey = sodium.randombytes_buf(32);
    const sealed = sealItem(sodium, random, payload, recordKey, address);
    for (const change of [{ itemId: 'item-2' }, { recordId: 'rec-2' }, { accountId: 'acct-2' }, { version: 8 }, { version: 6 }]) {
      expectProblem(() => openItem(sodium, sealed, recordKey, { ...address, ...change }), 'failed-check');
    }
  });

  it('can’t be opened with another record’s key, or with its wrapped key and contents mixed from two items', () => {
    const recordKey = sodium.randombytes_buf(32);
    const a = sealItem(sodium, random, payload, recordKey, address);
    const b = sealItem(sodium, random, { ...payload, data: { other: true } }, recordKey, address);
    expectProblem(() => openItem(sodium, a, sodium.randombytes_buf(32), address), 'failed-check');
    expectProblem(() => openItem(sodium, { wrappedKey: a.wrappedKey, ciphertext: b.ciphertext }, recordKey, address), 'failed-check');
  });

  it('uses a new item key every time it is saved', () => {
    const recordKey = sodium.randombytes_buf(32);
    const a = sealItem(sodium, random, payload, recordKey, address);
    const b = sealItem(sodium, random, payload, recordKey, address);
    expect(sodium.to_hex(a.wrappedKey)).not.toBe(sodium.to_hex(b.wrappedKey));
  });
});

describe('files', () => {
  const address = { accountId: 'acct', recordId: 'rec', fileId: 'file-1' };

  async function collect(pieces: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
    const out: Uint8Array[] = [];
    for await (const p of pieces) out.push(p);
    return out;
  }

  async function roundTrip(size: number) {
    const recordKey = sodium.randombytes_buf(32);
    const { fileKey, wrappedKey } = newFileKey(sodium, random, recordKey, address);
    const bytes = sodium.randombytes_buf(size);
    const encrypted = await collect(encryptFile(sodium, new Blob([bytes as BlobPart]), fileKey, address));
    const key = openFileKey(sodium, wrappedKey, recordKey, address);
    const back = await collect(decryptFile(sodium, piecesOf(sodium, new Blob(encrypted as BlobPart[])), key, address));
    return { bytes, encrypted, back: new Uint8Array(await new Blob(back as BlobPart[]).arrayBuffer()), fileKey };
  }

  it.each([0, 1, 65536, 65537, 200_000])('a %i-byte file comes back exactly, in 64 KiB pieces', async (size) => {
    const { bytes, encrypted, back } = await roundTrip(size);
    expect(sodium.to_hex(back)).toBe(sodium.to_hex(bytes));
    expect(encrypted.length).toBe(1 + Math.max(1, Math.ceil(size / 65536)));
  });

  it('refuses pieces reordered, repeated, altered or dropped, and a file cut short', async () => {
    const { encrypted, fileKey } = await roundTrip(200_000);
    const [header, a, b, c, d] = encrypted as [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
    const bent = b.slice();
    bent[5] = (bent[5] ?? 0) ^ 1;
    for (const pieces of [[header, b, a, c, d], [header, a, a, b, c, d], [header, a, bent, c, d], [header, a, c, d]]) {
      await expectProblemAsync(() => collect(decryptFile(sodium, pieces, fileKey, address)), 'failed-check');
    }
    await expectProblemAsync(() => collect(decryptFile(sodium, [header, a, b, c], fileKey, address)), 'truncated');
    await expectProblemAsync(
      () => collect(decryptFile(sodium, [header, a, b, c, d], fileKey, { ...address, fileId: 'file-2' })),
      'failed-check',
    );
  });
});

describe('the passphrase', () => {
  it('asks for 12 characters, and refuses common and simple ones', () => {
    expect(checkPassphrase('short one')).toEqual({ ok: false, reason: 'too-short' });
    expect(checkPassphrase('password1234')).toEqual({ ok: false, reason: 'too-common' });
    expect(checkPassphrase('Password 1234')).toEqual({ ok: false, reason: 'too-common' });
    expect(checkPassphrase('!!qwertyuiop2026')).toEqual({ ok: false, reason: 'too-common' });
    expect(checkPassphrase('aaaaaaaaaaaaaaa')).toEqual({ ok: false, reason: 'too-simple' });
    expect(checkPassphrase('123456789012345')).toEqual({ ok: false, reason: 'too-simple' });
    expect(checkPassphrase('my cat likes the red sofa')).toEqual({ ok: true });
  });

  it('suggests four words from the EFF list, without bias', () => {
    const phrase = generatePassphrase(random);
    expect(phrase.split(' ')).toHaveLength(4);
    expect(checkPassphrase(phrase).ok).toBe(true);
  });

  it('gives the same key for the same passphrase however an accent was typed', () => {
    const params = newKdfParams(sodium, random, fast);
    const composed = derivePassphraseKey(sodium, 'café au lait please', params, true);
    const decomposed = derivePassphraseKey(sodium, 'café au lait please', params, true);
    expect(sodium.to_hex(composed)).toBe(sodium.to_hex(decomposed));
  });

  it('refuses settings that are too weak for real use, or big enough to freeze a phone', () => {
    expectProblem(() => derivePassphraseKey(sodium, 'x', newKdfParams(sodium, random, { opsLimit: 1, memLimit: 8 * 1024 * 1024 })), 'bad-parameters');
    expectProblem(() => derivePassphraseKey(sodium, 'x', newKdfParams(sodium, random, { opsLimit: 3, memLimit: 1024 * 1024 * 1024 })), 'bad-parameters');
  });
});

describe('the recovery key', () => {
  it('is 13 groups of 4, without 0, O, 1 or I, and reads back exactly', () => {
    const key = sodium.randombytes_buf(32);
    const text = formatRecoveryKey(sodium, key);
    expect(text).toMatch(new RegExp(`^([${alphabet}]{4}-){12}[${alphabet}]{4}$`));
    expect(text).not.toMatch(/[01IO]/);
    expect(sodium.to_hex(parseRecoveryKey(sodium, text))).toBe(sodium.to_hex(key));
    expect(sodium.to_hex(parseRecoveryKey(sodium, text.toLowerCase().replace(/-/g, ' ')))).toBe(sodium.to_hex(key));
  });

  it('catches typing mistakes before trying to unlock', () => {
    const text = formatRecoveryKey(sodium, sodium.randombytes_buf(32));
    expectProblem(() => parseRecoveryKey(sodium, text.slice(0, -1)), 'recovery-key-typo');
    expectProblem(() => parseRecoveryKey(sodium, `O${text.slice(1)}`), 'recovery-key-typo');
    // Changing one character is caught by the check 15 times in 16 (93.75%).
    // Measured over many keys, not one: with a single key, 7 or more of the
    // 31 changes slip through by chance about 1 run in 250. Over 40 keys
    // (1,240 changes) the rate sits within about 0.7% of 93.75%, so a floor of
    // 88% never fails by chance but still catches a check that's broken.
    let caught = 0;
    let tried = 0;
    for (let k = 0; k < 40; k++) {
      const key = formatRecoveryKey(sodium, sodium.randombytes_buf(32));
      for (const c of alphabet) {
        if (c === key[0]) continue;
        tried++;
        try {
          parseRecoveryKey(sodium, c + key.slice(1));
        } catch {
          caught++;
        }
      }
    }
    expect(caught / tried).toBeGreaterThanOrEqual(0.88);
  });
});

describe('the account key', () => {
  it('opens with the passphrase or the recovery key, and nothing else', () => {
    const keys = createAccountKeys(sodium, random, 'my cat likes the red sofa', 'acct', fast);
    expect(sodium.to_hex(unlockWithPassphrase(sodium, keys.passphraseWrap, 'my cat likes the red sofa', 'acct', true))).toBe(sodium.to_hex(keys.accountKey));
    expect(sodium.to_hex(unlockWithRecoveryKey(sodium, keys.recoveryWrap, keys.recoveryKeyText, 'acct'))).toBe(sodium.to_hex(keys.accountKey));
    expectProblem(() => unlockWithPassphrase(sodium, keys.passphraseWrap, 'my cat likes the red sofa!', 'acct', true), 'wrong-passphrase');
    expectProblem(() => unlockWithPassphrase(sodium, keys.passphraseWrap, 'my cat likes the red sofa', 'other-account', true), 'wrong-passphrase');
    const other = createAccountKeys(sodium, random, 'x', 'acct', fast);
    expectProblem(() => unlockWithRecoveryKey(sodium, keys.recoveryWrap, other.recoveryKeyText, 'acct'), 'wrong-recovery-key');
  });

  it('changing the passphrase or reissuing the recovery key re-wraps the same account key, and the old ones stop working', () => {
    const keys = createAccountKeys(sodium, random, 'the first passphrase', 'acct', fast);
    const changed = wrapForPassphrase(sodium, random, keys.accountKey, 'a second passphrase', 'acct', fast);
    expect(sodium.to_hex(unlockWithPassphrase(sodium, changed, 'a second passphrase', 'acct', true))).toBe(sodium.to_hex(keys.accountKey));
    expectProblem(() => unlockWithPassphrase(sodium, changed, 'the first passphrase', 'acct', true), 'wrong-passphrase');
    const reissued = issueRecoveryKey(sodium, random, keys.accountKey, 'acct');
    expectProblem(() => unlockWithRecoveryKey(sodium, reissued.recoveryWrap, keys.recoveryKeyText, 'acct'), 'wrong-recovery-key');
  });

  it('opens each record key only for its own record', () => {
    const accountKey = sodium.randombytes_buf(32);
    const { recordKey, wrapped } = newRecordKey(sodium, random, accountKey, 'acct', 'rec-1');
    expect(sodium.to_hex(openRecordKey(sodium, wrapped, accountKey, 'acct', 'rec-1'))).toBe(sodium.to_hex(recordKey));
    expectProblem(() => openRecordKey(sodium, wrapped, accountKey, 'acct', 'rec-2'), 'failed-check');
  });

  it('is kept on a device wrapped by a key the browser won’t reveal', async () => {
    const deviceKey = await newDeviceKey();
    expect(deviceKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', deviceKey)).rejects.toThrow();
    const accountKey = sodium.randombytes_buf(32);
    const wrapped = await wrapWithDeviceKey(deviceKey, accountKey, 'acct');
    expect(sodium.to_hex(await unwrapWithDeviceKey(deviceKey, wrapped, 'acct'))).toBe(sodium.to_hex(accountKey));
    await expectProblemAsync(() => unwrapWithDeviceKey(deviceKey, wrapped, 'other'), 'failed-check');
    const otherDevice = await newDeviceKey();
    await expectProblemAsync(() => unwrapWithDeviceKey(otherDevice, wrapped, 'acct'), 'failed-check');
  });
});

describe('test vectors', () => {
  // Fixed inputs and a seeded random source give fixed outputs. They are
  // recorded in __snapshots__/crypto.test.ts.snap: any change to the
  // formats, bindings or algorithms changes them, and fails this test. They
  // are also what a second implementation (the server's checks, another
  // client) is tested against. See docs/crypto-review.md.
  it('are unchanged', async () => {
    const r = seededRandom(sodium, 'say-it-once test vectors v1');
    const keys = createAccountKeys(sodium, r, 'correct horse battery staple', 'acct-0001', fast);
    const record = newRecordKey(sodium, r, keys.accountKey, 'acct-0001', 'rec-0001');
    const address: ItemAddress = { accountId: 'acct-0001', recordId: 'rec-0001', itemId: 'item-0001', version: 1 };
    const item = sealItem(
      sodium,
      r,
      { schema: 1, type: 'quickNote', data: { text: 'Physio at 10.' }, private: false, createdAt: '2026-06-01T10:00:00.000Z', updatedAt: '2026-06-01T10:00:00.000Z' },
      record.recordKey,
      address,
    );
    const fileAddress = { accountId: 'acct-0001', recordId: 'rec-0001', fileId: 'file-0001' };
    const file = newFileKey(sodium, r, record.recordKey, fileAddress);
    const b64 = (u: Uint8Array) => sodium.to_base64(u, sodium.base64_variants.URLSAFE_NO_PADDING);

    const vectors = {
      settings: { argon2id: { opsLimit: fast.opsLimit, memLimit: fast.memLimit }, note: 'test settings; the app uses 3 passes and 64 MiB' },
      passphrase: 'correct horse battery staple',
      accountKey: b64(keys.accountKey),
      passphraseSalt: b64(keys.passphraseWrap.kdf.salt),
      accountKeyWrappedByPassphrase: b64(keys.passphraseWrap.wrapped),
      recoveryKey: keys.recoveryKeyText,
      accountKeyWrappedByRecoveryKey: b64(keys.recoveryWrap.wrapped),
      recordKey: b64(record.recordKey),
      recordKeyWrapped: b64(record.wrapped),
      item: { address, wrappedKey: b64(item.wrappedKey), ciphertext: b64(item.ciphertext) },
      fileKey: b64(file.fileKey),
      fileKeyWrapped: b64(file.wrappedKey),
    };
    expect(vectors).toMatchSnapshot();

    // And they open.
    expect(openItem(sodium, item, openRecordKey(sodium, record.wrapped, unlockWithPassphrase(sodium, keys.passphraseWrap, 'correct horse battery staple', 'acct-0001', true), 'acct-0001', 'rec-0001'), address).data).toEqual({
      text: 'Physio at 10.',
    });
  });
});
