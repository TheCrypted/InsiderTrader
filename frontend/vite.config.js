import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy for model API (port 8000)
      '/model-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/model-api/, ''),
      },
      // Proxy for Alpaca Market Data API
      '/alpaca-api': {
        target: 'https://data.alpaca.markets/v2',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/alpaca-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Always set authentication headers from environment variables
            const apiKey = process.env.VITE_ALPACA_API_KEY;
            const apiSecret = process.env.VITE_ALPACA_SECRET;
            
            if (apiKey && apiSecret) {
              proxyReq.setHeader('APCA-API-KEY-ID', apiKey);
              proxyReq.setHeader('APCA-API-SECRET-KEY', apiSecret);
            } else {
              console.warn('Alpaca API keys not found in environment variables');
            }
            // Remove any existing Host header and let changeOrigin handle it
            proxyReq.removeHeader('host');
          });
        },
      },
    },
  },
})
