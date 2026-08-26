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
    // "vite preview" (usado en producción vía npm start) rechaza por defecto
    // cualquier Host que no sea localhost, como protección contra DNS
    // rebinding. En Railway el dominio público llega con un Host distinto
    // (ej. algo-production.up.railway.app) y cambia según el servicio, así
    // que se permite cualquiera: esto solo sirve archivos estáticos ya
    // compilados, no hay lógica sensible que dependa del header Host.
    allowedHosts: true,
    // "vite preview" no agrega NINGÚN header de seguridad por defecto (a
    // diferencia de la API en server/src/app.js, que sí los tiene). Sin esto,
    // el panel se podría embeber en un iframe de cualquier sitio (clickjacking).
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=()',
      // El panel SÍ ejecuta JavaScript (a diferencia de la vista previa de un
      // comprobante), así que su CSP tiene que permitir sus propios scripts y
      // estilos; 'unsafe-inline' en estilos hace falta porque Bootstrap/React
      // inyectan estilos en línea. connect-src apunta a la API real (el mismo
      // dominio al que ya llama api.js vía VITE_API_URL).
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; connect-src *; frame-ancestors 'none'; " +
        "base-uri 'none'; object-src 'none'",
    },
  },
});
