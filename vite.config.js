import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // El panel llama al API en :3000. Con proxy, el navegador ve un solo
    // origen y no hay que lidiar con CORS en desarrollo.
    proxy: {
      '/panel': { target: 'http://localhost:3000', changeOrigin: true },
      '/api':   { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: {
    allowedHosts: true,
  },
});
