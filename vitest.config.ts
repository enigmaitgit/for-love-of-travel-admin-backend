/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/cms/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  esbuild: {
    target: 'node14'
  }
});
