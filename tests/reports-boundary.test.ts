// @vitest-environment node
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Proves the lint rule that keeps report code away from private data
// actually fires. If someone weakens eslint.config.js, this fails.
async function lintAs(filePath: string, code: string) {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports');
}

describe('reports import boundary', () => {
  it.each([
    ["import { db } from '../store/db';"],
    ["import { db } from '../../store';"],
    ["import { push } from '../sync/engine';"],
    ["import type { Record } from '../domain/types';"],
    ["import type { Item } from '../../domain/types';"],
    ["import { upgrade } from '../domain/schema';"],
    ["import { validate } from '../domain/validate';"],
    ["import { blank } from '../domain/blank';"],
    ["import * as domain from '../domain';"],
    ["import Dexie from 'dexie';"],
  ])('blocks %s inside src/reports', async (code) => {
    expect(await lintAs('src/reports/example.ts', code)).toHaveLength(1);
  });

  it.each([
    ["import type { ShareableRecord } from '../shareable/types';"],
    ["import { impactAreaLabel } from '../domain/vocab';"],
    ["import { readableDate } from '../domain/format';"],
    ["import { formatPence } from '../domain/money';"],
  ])('allows %s inside src/reports', async (code) => {
    expect(await lintAs('src/reports/example.ts', code)).toHaveLength(0);
  });

  it('does not restrict the same imports outside src/reports', async () => {
    const code = "import { db } from '../store/db';";
    expect(await lintAs('src/screens/example.ts', code)).toHaveLength(0);
  });
});
