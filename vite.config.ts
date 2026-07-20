/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Vite 설정: React + Tailwind CSS v4 + PWA(오프라인·홈화면 추가).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 새 버전을 배포하면 서비스워커가 자동으로 갱신·적용된다.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '운행일지·작전판',
        short_name: '운행일지',
        description: '개인용 대리운전 기록·대기 전략 도구',
        lang: 'ko',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 셸(js/css/html/아이콘)을 캐시해 완전 오프라인 동작을 보장한다.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // Vitest(계산 유틸 단위 테스트) 설정.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
