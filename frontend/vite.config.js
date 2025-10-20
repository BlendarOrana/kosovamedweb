import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', '**/*.webp', '**/*.png', '**/*.jpg', '**/*.jpeg'], // Add your assets
  workbox: {
    // navigateFallback: '/index.html',
    // navigateFallbackAllowlist: [/^(?!\/).*/],
    navigateFallbackDenylist: [
      /^\/api\/.*$/, // Only exclude API calls, not static assets
    ],
    runtimeCaching: [
      // API caching
      {
        urlPattern: /^\/api\/.*$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache-v2',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 300
          }
        }
      },
      // Add static assets caching
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst', // Cache images aggressively
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      // Font caching
   
    ],
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
  },

    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Production optimizations
  build: {
    sourcemap: 'hidden', 
    minify: 'terser',
    
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-hot-toast'],
        },
      },
    },
    
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
    cssCodeSplit: true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },

  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: 4173,
    host: true,
  },
});