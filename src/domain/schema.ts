import { currentSchema, type Item } from './types';

// Upgrading older items as they are read (docs/architecture.md, "Schema
// versions"). Each item type has a payload version. When a type's shape
// changes, raise its number in types.ts and add a step here that turns
// version n into n + 1. No type has changed yet, so there are no steps.

type Step = (data: unknown) => unknown;
const steps: Partial<Record<Item['type'], Record<number, Step>>> = {};

export interface ReadItem {
  item: Item;
  /** True when the item was saved by a newer version of the app. */
  readOnly: boolean;
  /** True when the item was upgraded and should be saved back. */
  upgraded: boolean;
}

export function upgrade(stored: Item): ReadItem {
  const target = currentSchema[stored.type];
  if (stored.schema > target) return { item: stored, readOnly: true, upgraded: false };
  let data: unknown = stored.data;
  for (let v = stored.schema; v < target; v++) {
    const step = steps[stored.type]?.[v];
    if (!step) throw new Error(`No upgrade from ${stored.type} version ${v}`);
    data = step(data);
  }
  const upgraded = stored.schema < target;
  return { item: upgraded ? ({ ...stored, schema: target, data } as Item) : stored, readOnly: false, upgraded };
}
