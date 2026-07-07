import { defineConfig } from 'vitest/config';

export default defineConfig({
  // demo files resolve a tsconfig without a `jsx` field — pin the automatic
  // runtime so JSX transforms identically everywhere.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true, // RTL auto-cleanup registers via global afterEach

    setupFiles: ['./vitest.setup.ts'],
    include: ['package/**/*.test.{ts,tsx}', 'demo/src/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        // ships .module.css imports node can't load directly
        inline: ['react-tweet'],
      },
    },
  },
});
