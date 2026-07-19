// localStorage에 쓰는 키 이름을 한 곳에 모아 오타를 막는다.
// 모든 키는 'dv.'(driving log) 접두사로 다른 앱과 충돌을 피한다.
export const STORAGE_KEYS = {
  schemaVersion: 'dv.schemaVersion', // 숫자: 저장 구조 버전
  settings: 'dv.settings', // Settings
  trips: 'dv.trips', // Trip[]
  dailyExpenses: 'dv.dailyExpenses', // DailyExpenses
} as const

// 코드가 기대하는 현재 스키마 버전. 구조가 바뀌면 이 숫자를 올린다.
export const SCHEMA_VERSION = 1
