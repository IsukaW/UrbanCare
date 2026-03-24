import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/common': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/common/, ''),
      },
      '/api/appointments': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/appointments/, ''),
      },
      '/api/doctors': {
        target: 'http://localhost:5003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/doctors/, ''),
      },
      '/api/patients': {
        target: 'http://localhost:5004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/patients/, ''),
      },
    },
  },
});
