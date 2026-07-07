import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true, // RTL auto-cleanup registers via global afterEach

    setupFiles: ['./vitest.setup.ts'],
    include: [
      'package/**/*.test.{ts,tsx}',
      'demo/src/**/*.test.{ts,tsx}',
    ],
    server: {
      deps: {
        // ships .module.css imports node can't load directly
        inline: ['react-tweet'],
      },
    },
  },
});
