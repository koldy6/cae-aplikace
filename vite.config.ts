import { defineConfig, type Plugin } from 'vitest/config';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; " +
  "media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

// Build-only: dev needs inline <style> injected by Vite (ARCHITECTURE section 9).
const cspPlugin = (): Plugin => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig({
  base: './', // works both locally and under the GitHub Pages subpath
  plugins: [cspPlugin()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
