import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/lib',
    emptyOutDir: false,
    // public/ (the compound lexicon data) belongs to the application, not to the library
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/lib.ts'),
      name: 'SanskrtNaWeb',
      fileName: (format) => `sanskrt-core.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Match subpath imports too ('@siva-sh/vidyut/wasm-url'); a plain string only matches
      // the bare specifier and the 1.4 MB WebAssembly binary ended up inlined in the bundle.
      external: [/^@siva-sh\/vidyut(\/.*)?$/, /^node:/],
      output: {
        globals: (id: string) => (id.startsWith('@siva-sh/vidyut') ? 'Vidyut' : id)
      }
    }
  }
});
