import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the app under /<repository>/ (set by .github/workflows/pages.yml)
  base: process.env.PAGES_BASE || '/',
  server: {
    port: 5173,
    open: false
  },
  optimizeDeps: {
    // Pre-bundling moves the package into node_modules/.vite, which breaks its
    // `new URL('vidyut_bg.wasm', import.meta.url)` lookup (the dev server then answers
    // the .wasm request with index.html and WebAssembly fails to compile).
    exclude: ['@siva-sh/vidyut']
  },
  test: {
    globals: true,
    environment: 'node'
  }
});
