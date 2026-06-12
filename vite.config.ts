import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'es2023',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: false,
  },
});
