import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    mockReset: true,
    passWithNoTests: false,
    restoreMocks: true,
  },
});
