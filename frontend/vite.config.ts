import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable code splitting and tree shaking
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // UI chunk for UI components and icons
          ui: ['lucide-react', 'react-hot-toast', 'clsx', 'tailwind-merge'],
          // Utils chunk for utilities and services
          utils: ['axios', '@tanstack/react-query'],
          // Forms chunk for form-related libraries
          forms: ['react-hook-form', 'react-dropzone'],
          // Virtual scrolling chunk
          virtualization: ['react-window', 'react-window-infinite-loader'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Minify for production using esbuild (faster and built-in)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@tanstack/react-query',
      'lucide-react',
      'react-hot-toast',
      'clsx',
      'tailwind-merge',
      'react-hook-form',
      'react-dropzone',
      'react-window',
      'react-window-infinite-loader',
    ],
  },
});