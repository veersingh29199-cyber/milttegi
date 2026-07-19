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
  platformCompare,
  destinationRanking,
  weeklySummary,
} from './board'
import { DEFAULT_SETTINGS } from '../storage/store'
import type { Trip, DailyExpenses } from '../types/models'

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

describe('platformCompare — 위젯② 플랫폼 비교', () => {
  it('플랫폼별 건수·평균요금·실수령을 집계한다', () => {
    const trips = [
      trip('a', '2026-07-20T20:00:00', { platformId: 'kakao', fare: 10000 }),
      trip('b', '2026-07-20T21:00:00', { platformId: 'kakao', fare: 20000 }),
      trip('c', '2026-07-20T22:00:00', { platformId: 'tmap', fare: 15000 }),
    ]
    const stats = platformCompare(trips, DEFAULT_SETTINGS)
    const kakao = stats.find((s) => s.id === 'kakao')!
    expect(kakao.count).toBe(2)
    expect(kakao.avgFare).toBe(15000) // (10000+20000)/2
    expect(kakao.netSum).toBe(24000) // (8000+16000)
    expect(kakao.avgNet).toBe(12000)
    // 건수 많은 순 정렬
    expect(stats[0].id).toBe('kakao')
  })
})

describe('destinationRanking — 위젯③ 도착지 랭킹', () => {
  it('도착지별 회전(연결)과 막콜 비율을 집계한다', () => {
    // 동래(26260) 도착 2건: 하나는 뒤에 콜 이어짐, 하나는 세션 마지막(막콜)
    const trips = [
      trip('a', '2026-07-20T20:00:00', { to: '26260' }), // →b 이어짐(gap 40)
      trip('b', '2026-07-20T20:40:00', { to: '26530' }), // 막콜(다음은 3시간 뒤)
      trip('c', '2026-07-20T23:50:00', { to: '26260' }), // 막콜(세션 끝)
    ]
    const ranking = destinationRanking(trips, DEFAULT_SETTINGS)
    const dongrae = ranking.find((d) => d.code === '26260')!
    expect(dongrae.count).toBe(2)
    expect(dongrae.avgGapMin).toBe(40) // a만 회전 데이터 있음
    expect(dongrae.lastCallRate).toBe(0.5) // 2건 중 c가 막콜
  })
})

describe('weeklySummary — 위젯④ 주간 요약', () => {
  it('실수령·경비·순수익·시간당을 집계한다', () => {
    // 오늘 영업일 기준 같은 날 세션 2건(20:00, 21:00 = 60분 근무)
    const trips = [
      trip('a', '2026-07-20T20:00:00', { fare: 10000 }),
      trip('b', '2026-07-20T21:00:00', { fare: 10000 }),
    ]
    const expenses: DailyExpenses = { '2026-07-20': 5000 }
    const s = weeklySummary(trips, expenses, DEFAULT_SETTINGS, '2026-07-20T23:00:00', 7)
    expect(s.tripCount).toBe(2)
    expect(s.netSum).toBe(16000) // 8000 + 8000
    expect(s.expenseSum).toBe(5000)
    expect(s.profit).toBe(11000)
    expect(s.workedHours).toBe(1) // 20:00~21:00
    expect(s.hourlyNet).toBe(16000) // 16000 / 1시간
    expect(s.vsMinHourly).toBe(1000) // 16000 − 15000
  })
  it('범위 밖 날짜는 제외한다', () => {
    const trips = [
      trip('old', '2026-07-01T20:00:00', { fare: 99000 }), // 7일보다 이전
      trip('new', '2026-07-20T20:00:00', { fare: 10000 }),
    ]
    const s = weeklySummary(trips, {}, DEFAULT_SETTINGS, '2026-07-20T23:00:00', 7)
    expect(s.tripCount).toBe(1)
    expect(s.netSum).toBe(8000)
  })
})
