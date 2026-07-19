import { STORAGE_KEYS, SCHEMA_VERSION } from './keys'
import { migrate, type StoreSnapshot } from './migrations'
import type { Settings, Trip, DailyExpenses } from '../types/models'

// 초기 기본 설정. 지시서 3번의 초기값을 그대로 반영한다.
// 주의: 수수료율·최소 시급은 사실이 아니라 "고쳐 쓰라"는 초기값이다.
export const DEFAULT_SETTINGS: Settings = {
  platforms: [
    { id: 'kakao', name: '카카오', feeRate: 0.2 },
    { id: 'tmap', name: '티맵', feeRate: 0.2 },
  ],
  minHourly: 15000,
  // 즐겨찾기 초기값: 부산 강서/동래/사상/사하/북구 + 경남 김해/창원
  favorites: ['26440', '26260', '26530', '26380', '26320', '48250', '48120'],
  // 내 구역 프리셋: 강서구(26440) 하위 3개
  customZones: [
    { id: 'zone-sinho', parentCode: '26440', name: '신호단지' },
    { id: 'zone-myeongji-center', parentCode: '26440', name: '명지 중심' },
    { id: 'zone-myeongji-outer', parentCode: '26440', name: '명지 외곽' },
  ],
  sessionGapMin: 120,
}

// --- 저수준 읽기/쓰기: JSON 직렬화를 한 곳에서 처리한다 ---

// 키 하나를 읽어 파싱한다. 없거나 깨졌으면 fallback을 돌려준다.
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// 값을 JSON으로 저장한다.
function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// --- 도메인별 접근자 ---

export function getSettings(): Settings {
  // 저장된 설정에 기본값을 겹쳐, 새 설정 항목이 추가돼도 빠지지 않게 한다.
  const saved = readJson<Partial<Settings>>(STORAGE_KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

export function saveSettings(settings: Settings): void {
  writeJson(STORAGE_KEYS.settings, settings)
}

export function getTrips(): Trip[] {
  return readJson<Trip[]>(STORAGE_KEYS.trips, [])
}

export function saveTrips(trips: Trip[]): void {
  writeJson(STORAGE_KEYS.trips, trips)
}

export function getDailyExpenses(): DailyExpenses {
  return readJson<DailyExpenses>(STORAGE_KEYS.dailyExpenses, {})
}

export function saveDailyExpenses(expenses: DailyExpenses): void {
  writeJson(STORAGE_KEYS.dailyExpenses, expenses)
}

// --- 내보내기/가져오기(5단계에서 화면 연결). 왕복 직렬화가 핵심 ---

// 앱 전체 데이터를 하나의 객체로 묶는다(JSON 파일로 내보낼 때 사용).
export interface ExportBundle {
  schemaVersion: number
  settings: Settings
  trips: Trip[]
  dailyExpenses: DailyExpenses
}

export function exportAll(): ExportBundle {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: getSettings(),
    trips: getTrips(),
    dailyExpenses: getDailyExpenses(),
  }
}

// 내보낸 번들을 그대로 다시 저장한다(가져오기). 버전이 낮으면 마이그레이션을 태운다.
export function importAll(bundle: ExportBundle): void {
  const [, snapshot] = migrate(bundle.schemaVersion ?? SCHEMA_VERSION, {
    settings: bundle.settings,
    trips: bundle.trips,
    dailyExpenses: bundle.dailyExpenses,
  })
  writeJson(STORAGE_KEYS.settings, snapshot.settings)
  writeJson(STORAGE_KEYS.trips, snapshot.trips)
  writeJson(STORAGE_KEYS.dailyExpenses, snapshot.dailyExpenses)
  writeJson(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION)
}

// --- 앱 시작 초기화 ---

// 앱이 켜질 때 딱 한 번 호출한다.
// 저장된 스키마 버전을 확인해 필요하면 마이그레이션을 돌리고, 최신 버전을 기록한다.
export function initStore(): void {
  const storedVersion = readJson<number>(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION)
  if (storedVersion !== SCHEMA_VERSION) {
    const snapshot: StoreSnapshot = {
      settings: readJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
      trips: readJson(STORAGE_KEYS.trips, []),
      dailyExpenses: readJson(STORAGE_KEYS.dailyExpenses, {}),
    }
    const [version, migrated] = migrate(storedVersion, snapshot)
    writeJson(STORAGE_KEYS.settings, migrated.settings)
    writeJson(STORAGE_KEYS.trips, migrated.trips)
    writeJson(STORAGE_KEYS.dailyExpenses, migrated.dailyExpenses)
    writeJson(STORAGE_KEYS.schemaVersion, version)
  } else {
    // 최초 실행이거나 이미 최신 버전이면 버전 기록만 보장한다.
    writeJson(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION)
  }
}

// 앱의 모든 저장 데이터를 지운다(설정 '전체 삭제'용).
// 되돌릴 수 없으므로 화면에서 2단계 확인을 거친 뒤에만 호출한다.
export function clearAll(): void {
  for (const key of Object.values(STORAGE_KEYS)) localStorage.removeItem(key)
}
