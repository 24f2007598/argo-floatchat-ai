import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // make sure it matches what Vite shows in terminal
    proxy: {
      '/query': 'http://127.0.0.1:8000', // forward API requests to your FastAPI backend
      '/profile': 'http://127.0.0.1:8000', // if you use other endpoints
      '/record': 'http://127.0.0.1:8000'
    }
  }
});
