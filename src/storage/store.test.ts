import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  getTrips,
  saveTrips,
  exportAll,
  importAll,
  initStore,
  type ExportBundle,
} from './store'
import { STORAGE_KEYS, SCHEMA_VERSION } from './keys'
import type { Trip } from '../types/models'

// node 환경에는 localStorage가 없으므로, JSON을 담는 간단한 인메모리 목을 주입한다.
// store.ts는 getItem/setItem만 쓰므로 이 정도면 충분하고 결정적으로 동작한다.
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  clear(): void {
    this.map.clear()
  }
}

beforeEach(() => {
  // 각 테스트 전에 깨끗한 저장소로 초기화한다.
  ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage()
})

const sampleTrip: Trip = {
  id: 't1',
  at: '2026-07-19T21:15:00',
  platformId: 'kakao',
  from: '26440',
  to: '26260',
  fromZone: 'zone-sinho',
  fare: 14000,
  rain: true,
  event: false,
  memo: '테스트 콜',
}

describe('기본 설정', () => {
  it('저장된 값이 없으면 기본 설정을 돌려준다', () => {
    const s = getSettings()
    expect(s).toEqual(DEFAULT_SETTINGS)
    expect(s.platforms).toHaveLength(2)
    expect(s.favorites).toHaveLength(7)
    expect(s.sessionGapMin).toBe(120)
  })

  it('저장한 값에 기본값을 겹쳐, 새 항목이 빠지지 않게 한다', () => {
    // minHourly만 바꿔 저장해도, 나머지 기본 항목은 그대로 유지돼야 한다.
    saveSettings({ ...DEFAULT_SETTINGS, minHourly: 20000 })
    const s = getSettings()
    expect(s.minHourly).toBe(20000)
    expect(s.platforms).toEqual(DEFAULT_SETTINGS.platforms)
  })
})

describe('trips 읽기/쓰기', () => {
  it('저장한 운행 기록을 그대로 읽는다', () => {
    saveTrips([sampleTrip])
    expect(getTrips()).toEqual([sampleTrip])
  })
})

describe('내보내기/가져오기 왕복 직렬화', () => {
  it('exportAll → importAll 후 데이터가 완전히 동일하다', () => {
    // 데이터를 채운다.
    saveSettings({ ...DEFAULT_SETTINGS, minHourly: 18000 })
    saveTrips([sampleTrip])
    ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(
      STORAGE_KEYS.dailyExpenses,
      JSON.stringify({ '2026-07-19': 12000 }),
    )

    // 내보낸 뒤 JSON 파일 저장을 흉내내 문자열로 왕복시킨다(진짜 직렬화 경로).
    const exported = exportAll()
    const roundTripped: ExportBundle = JSON.parse(JSON.stringify(exported))

    // 저장소를 비우고 다시 가져온다.
    ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage()
    importAll(roundTripped)

    // 가져온 결과가 내보낸 것과 완전히 동일해야 한다.
    expect(exportAll()).toEqual(exported)
    expect(getTrips()).toEqual([sampleTrip])
    expect(getSettings().minHourly).toBe(18000)
  })
})

describe('initStore — 시작 초기화', () => {
  it('스키마 버전을 최신으로 기록한다', () => {
    initStore()
    const raw = (
      globalThis as unknown as { localStorage: MemoryStorage }
    ).localStorage.getItem(STORAGE_KEYS.schemaVersion)
    expect(raw).toBe(String(SCHEMA_VERSION))
  })
})
