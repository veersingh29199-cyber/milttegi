/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 설정: React + Tailwind CSS v4 플러그인을 켠다.
// PWA(오프라인·홈화면 추가) 설정은 7단계에서 추가한다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vitest(계산 유틸 단위 테스트) 설정 — 2단계에서 실제 테스트를 채운다.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
