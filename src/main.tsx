import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initStore } from './storage/store.ts'

// 앱이 켜질 때 가장 먼저 저장 계층을 초기화한다(스키마 버전 확인·마이그레이션).
initStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
