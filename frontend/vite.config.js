import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'WealthWise',
        short_name: 'WealthWise',
        description: 'Smart Savings & Tax Planning for India',
        theme_color: '#E8921A',
        background_color: '#0e0806',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon_192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})