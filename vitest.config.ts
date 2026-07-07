import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['package/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        // ships .module.css imports node can't load directly
        inline: ['react-tweet'],
      },
    },
  },
});
