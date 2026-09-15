import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// O plugin do Base44 foi removido na migração. Ele também fornecia o atalho
// '@/' usado em todo o código — por isso o alias abaixo, que o substitui.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
