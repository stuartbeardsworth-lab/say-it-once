import type { Sodium } from './sodium';

// Where random bytes come from. In the app it is always libsodium's
// randombytes_buf (the browser's secure generator). Tests pass a seeded
// generator instead, so the test vectors come out the same every time.

export type Random = (length: number) => Uint8Array;

export function secureRandom(sodium: Sodium): Random {
  return (length) => sodium.randombytes_buf(length);
}

/** FOR TESTS ONLY: the same bytes every time for the same seed. Never used in the app. */
export function seededRandom(sodium: Sodium, seed: string): Random {
  let counter = 0;
  return (length) => {
    const out = new Uint8Array(length);
    for (let filled = 0; filled < length; filled += 64) {
      const block = sodium.crypto_generichash(64, `${seed}/${counter++}`, null);
      out.set(block.subarray(0, Math.min(64, length - filled)), filled);
    }
    return out;
  };
}
