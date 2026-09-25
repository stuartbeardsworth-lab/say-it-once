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
              regex: '(^|/)(store|sync|domain)(/|$)',
              message:
                'Reports may only import the shareable view, never the local store, sync code or raw record types.',
            },
          ],
        },
      ],
    },
  },
);
