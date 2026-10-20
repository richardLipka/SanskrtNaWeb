import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/lib',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/lib.ts'),
      name: 'SanskrtNaWeb',
      fileName: (format) => `sanskrt-core.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['@siva-sh/vidyut'],
      output: {
        globals: {
          '@siva-sh/vidyut': 'Vidyut'
        }
      }
    }
  }
});
