import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Small development scripts, run with Node.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // In tests, "!" is a plain way to say "this must exist"; a wrong guess
    // fails the test loudly. App code keeps the stricter rule.
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    // The privacy boundary (docs/architecture.md, "How bypass is prevented").
    // Report code may only receive the shareable view. It must never reach the
    // local store, the sync engine or the raw record types in src/domain/,
    // because those still carry private items.
    files: ['src/reports/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dexie',
              message: 'Reports must not touch storage. Use the shareable view.',
            },
          ],
          patterns: [
            {
              // The store, sync code, and the raw record types that still
              // carry private items. Wording lists, dates and money helpers
              // in src/domain/ are allowed.
              regex: '(^|/)(store|sync)(/|$)|(^|/)domain/(types|schema|validate|blank)$|(^|/)domain$',
              message:
                'Reports may only import the shareable view, never the local store, sync code or raw record types.',
            },
          ],
        },
      ],
    },
  },
);
