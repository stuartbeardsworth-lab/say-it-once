import { defineConfig } from 'vitest/config';

// Server tests run against a real PostgreSQL. Each test file gets its own
// new database (test/db.ts), so files can run side by side.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
  },
});
