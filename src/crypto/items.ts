import { newKey, open, seal, unwrapKey, wrapKey } from './aead';
import type { Binding } from './binding';
import { CryptoProblem } from './problems';
import type { Random } from './random';
import type { Sodium } from './sodium';

// Items as encrypted envelopes (docs/architecture.md, "Data model as
// encrypted items"). Each save makes a new random item key; the contents are
// sealed with it, and the item key is wrapped by the record key. Both are
// bound to the account, record, item and version.

/** Contents are padded to a multiple of this, so their size says little. */
export const PAD_BLOCK = 512;

/** What the server stores for an item, besides its IDs and version. */
export interface SealedItem {
  wrappedKey: Uint8Array;
  ciphertext: Uint8Array;
}

export interface ItemAddress {
  accountId: string;
  /** Null for account-level items such as the profile. */
  recordId: string | null;
  itemId: string;
  /** The version this write will have once the server accepts it. */
  version: number;
}

/** The plaintext inside an item: its type is inside, so the server can't count kinds of entry. */
export interface ItemPayload {
  schema: number;
  type: string;
  data: unknown;
  private: boolean;
  createdAt: string;
  updatedAt: string;
}

const binding = (a: ItemAddress, purpose: 'item' | 'item-key'): Binding => ({
  purpose,
  accountId: a.accountId,
  recordId: a.recordId,
  objectId: a.itemId,
  version: a.version,
});

export function sealItem(sodium: Sodium, random: Random, payload: ItemPayload, recordKey: Uint8Array, address: ItemAddress): SealedItem {
  const itemKey = newKey(random);
  try {
    const plaintext = sodium.pad(new TextEncoder().encode(JSON.stringify(payload)), PAD_BLOCK);
    return {
      ciphertext: seal(sodium, random, plaintext, itemKey, binding(address, 'item')),
      wrappedKey: wrapKey(sodium, random, itemKey, recordKey, binding(address, 'item-key')),
    };
  } finally {
    sodium.memzero(itemKey);
  }
}

export function openItem(sodium: Sodium, sealed: SealedItem, recordKey: Uint8Array, address: ItemAddress): ItemPayload {
  const itemKey = unwrapKey(sodium, sealed.wrappedKey, recordKey, binding(address, 'item-key'));
  try {
    const padded = open(sodium, sealed.ciphertext, itemKey, binding(address, 'item'));
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(sodium.unpad(padded, PAD_BLOCK));
    } catch {
      throw new CryptoProblem('failed-check');
    }
    return JSON.parse(text) as ItemPayload;
  } finally {
    sodium.memzero(itemKey);
  }
}
