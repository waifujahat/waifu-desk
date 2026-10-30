import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  clearScreen: false,

  // Development Server
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/src-tauri/**', '**/target/**'],
    },
  },

  envPrefix: ['VITE_', 'TAURI_ENV_'],

  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
  },
  test: {
    environment: 'node',
  },
});
