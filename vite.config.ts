import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 相对路径，便于部署到任意子路径 / 静态托管（GitHub Pages、对象存储等）
  base: './',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // 只预缓存应用外壳，绝不预缓存 15MB 的 ROM 与 WASM 内核
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/roms/**', '**/cores/**', '**/covers/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // 内核体积大但极少变动 —— 首次运行后永久走缓存
            urlPattern: /\/cores\/.*\.(js|wasm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'nes-cores',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
          {
            urlPattern: /\/roms\/.*\.nes$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'nes-roms',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            urlPattern: /\/covers\/.*\.(jpg|png|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nes-covers',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      manifest: {
        name: 'NES Arcade · 红白机游戏厅',
        short_name: 'NES Arcade',
        description: '液态玻璃质感的 FC 红白机游戏在线合集，打开即玩',
        theme_color: '#0b0f1a',
        background_color: '#0b0f1a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: './favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          {
            src: './favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],

  build: {
    target: 'es2022',
    cssTarget: 'safari16',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // 模拟器内核独立分包 —— 只有进入游戏页才会拉取
          if (id.includes('nostalgist')) return 'emulator'
          if (id.includes('@tanstack')) return 'router'
          if (id.includes('motion') || id.includes('framer')) return 'motion'
          if (id.includes('fuse.js')) return 'search'
          if (id.includes('react')) return 'react'
        },
      },
    },
  },

  server: {
    port: 5173,
    host: true,
    // SharedArrayBuffer 不是必需，但开启后 fceumm 音频线程更稳
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
