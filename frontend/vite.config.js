import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Se actualiza sola cuando haces un nuevo despliegue
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'MT_MANAGER Cuadrilla',
        short_name: 'MT_MANAGER',
        description: 'Herramienta táctica para gestión de planta externa y redes.',
        theme_color: '#0b132b', // El color de tu barra superior
        background_color: '#050814', // El fondo oscuro puro de la app
        display: 'standalone', // ¡Esto es la magia! Oculta el navegador de Chrome/Safari
        orientation: 'portrait', // Fuerza a que la app se use en vertical
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});