
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix: Define __dirname for ESM environment which is required for path.resolve
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows imports like '@/components/DonationReceipt' to work correctly
      '@': path.resolve(__dirname, './'),
    },
  },
  define: {
    // This allows the @google/genai SDK to access the API key via process.env
    // We use a fallback to empty string to prevent build crashes if key is missing
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disabled for production speed
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'leaflet', 'lucide-react'],
          genai: ['@google/genai']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
