import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@config': resolve(import.meta.dirname, './src/config'),
      '@modules': resolve(import.meta.dirname, './src/modules'),
      '@domain': resolve(import.meta.dirname, './src/domain'),
      '@infrastructure': resolve(import.meta.dirname, './src/infrastructure'),
      '@application': resolve(import.meta.dirname, './src/application'),
      '@shared': resolve(import.meta.dirname, './src/shared'),
    },
  },
});
