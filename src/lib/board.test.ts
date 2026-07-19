import { describe, it, expect } from 'vitest'
import {
  autoMode,
  filterByMode,
  timeBucket,
  dayGroup,
  deriveTrips,
  aggregateCell,
  coarseGrid,
  shouldRefine,
} from './board'
import { DEFAULT_SETTINGS } from '../storage/store'
import type { Trip } from '../types/models'

function trip(id: string, at: string, extra: Partial<Trip> = {}): Trip {
  return {
    id,
    at,
    platformId: 'kakao', // 기본 수수료 0.2
    from: '26440',
    to: '26260',
    fare: 10000,
    rain: false,
    event: false,
    ...extra,
  }
}

describe('autoMode — 요일 자동 모드', () => {
  it('평일(월~금)은 강서', () => {
    // 2026-07-20은 월요일
    expect(autoMode('2026-07-20T20:00:00')).toBe('gangseo')
  })
  it('주말(토·일)은 동래', () => {
    // 2026-07-19는 일요일
    expect(autoMode('2026-07-19T20:00:00')).toBe('dongrae')
  })
  it('일요일 새벽 2시는 영업일상 토요일 → 동래', () => {
    expect(autoMode('2026-07-19T02:00:00')).toBe('dongrae')
  })
})

describe('filterByMode — 출발 시군구 필터', () => {
  it('강서 모드는 출발이 강서구(26440)인 기록만', () => {
    const trips = [trip('a', '2026-07-20T20:00:00', { from: '26440' }), trip('b', '2026-07-20T21:00:00', { from: '26260' })]
    expect(filterByMode(trips, 'gangseo').map((t) => t.id)).toEqual(['a'])
  })
})

describe('timeBucket / dayGroup', () => {
  it('시간대 구간 경계', () => {
    expect(timeBucket('2026-07-20T18:00:00')).toBe('evening')
    expect(timeBucket('2026-07-20T20:59:00')).toBe('evening')
    expect(timeBucket('2026-07-20T21:00:00')).toBe('peak')
    expect(timeBucket('2026-07-20T23:59:00')).toBe('peak')
    expect(timeBucket('2026-07-20T03:00:00')).toBe('dawn')
    expect(timeBucket('2026-07-20T10:00:00')).toBe('day')
  })
  it('주중/주말은 영업일 요일 기준', () => {
    expect(dayGroup('2026-07-20T20:00:00')).toBe('weekday') // 월
    expect(dayGroup('2026-07-19T20:00:00')).toBe('weekend') // 일
  })
})

describe('deriveTrips — 실수령·회전간격', () => {
  it('막콜(세션 마지막)은 회전간격이 null', () => {
    const trips = [
      trip('a', '2026-07-20T20:00:00'),
      trip('b', '2026-07-20T20:40:00'), // a→b 40분
    ]
    const d = deriveTrips(trips, DEFAULT_SETTINGS)
    const a = d.find((x) => x.trip.id === 'a')!
    const b = d.find((x) => x.trip.id === 'b')!
    expect(a.gapMin).toBe(40)
    expect(a.net).toBe(8000) // 10000 × 0.8
    expect(b.gapMin).toBeNull() // 막콜
  })
  it('세션이 끊기면 그 직전 기록도 막콜(회전간격 null)', () => {
    const trips = [
      trip('a', '2026-07-20T20:00:00'),
      trip('b', '2026-07-20T20:30:00'),
      trip('c', '2026-07-20T23:00:00'), // +150분 > 120 → 세션 컷
    ]
    const d = deriveTrips(trips, DEFAULT_SETTINGS)
    expect(d.find((x) => x.trip.id === 'b')!.gapMin).toBeNull() // 첫 세션 막콜
  })
})

describe('aggregateCell — 시간당 실수령', () => {
  it('회전 있는 기록 실수령 합 / 회전간격 합 × 60', () => {
    // a: net 8000, gap 60분 / b: net 8000, gap 60분 / c: 막콜(제외)
    const trips = [
      trip('a', '2026-07-20T20:00:00'),
      trip('b', '2026-07-20T21:00:00'),
      trip('c', '2026-07-20T22:00:00'),
    ]
    const d = deriveTrips(trips, DEFAULT_SETTINGS)
    const cell = aggregateCell(d)
    expect(cell.count).toBe(3)
    expect(cell.avgGapMin).toBe(60)
    // (8000+8000) / (60+60) × 60 = 16000/120×60 = 8000원/시
    expect(cell.hourlyNet).toBe(8000)
  })
  it('회전 데이터가 전혀 없으면 null', () => {
    const d = deriveTrips([trip('a', '2026-07-20T20:00:00')], DEFAULT_SETTINGS)
    const cell = aggregateCell(d)
    expect(cell.count).toBe(1)
    expect(cell.avgGapMin).toBeNull()
    expect(cell.hourlyNet).toBeNull()
  })
})

describe('coarseGrid / shouldRefine', () => {
  it('낮 표본이 없으면 낮 구간은 노출하지 않는다', () => {
    const trips = [trip('a', '2026-07-20T20:00:00'), trip('b', '2026-07-20T21:00:00')]
    const grid = coarseGrid(deriveTrips(trips, DEFAULT_SETTINGS))
    expect(grid.buckets).not.toContain('day')
    expect(grid.buckets).toContain('evening')
  })
  it('데이터가 얇으면 세분화하지 않는다', () => {
    const trips = [trip('a', '2026-07-20T20:00:00'), trip('b', '2026-07-20T21:00:00')]
    expect(shouldRefine(deriveTrips(trips, DEFAULT_SETTINGS))).toBe(false)
  })
})
