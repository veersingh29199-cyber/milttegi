import { describe, it, expect } from 'vitest'
import {
  netFare,
  turnGapMin,
  businessDay,
  businessWeekday,
  splitSessions,
  sessionDurationMin,
  dailyNetProfit,
} from './calc'
import type { Trip } from '../types/models'

// 테스트용 Trip을 짧게 만드는 헬퍼. at(종료 시각)만 다르면 되는 경우가 많다.
// 주의: at은 타임존 오프셋 없는 "로컬 시각"으로 쓴다.
// businessDay/turnGapMin 모두 로컬 시각으로 일관되게 동작하므로
// 시스템 타임존이 무엇이든 결과가 흔들리지 않는다(결정적 테스트).
function trip(id: string, at: string, extra: Partial<Trip> = {}): Trip {
  return {
    id,
    at,
    platformId: 'kakao',
    from: '26440',
    to: '26440',
    fare: 10000,
    rain: false,
    event: false,
    ...extra,
  }
}

describe('netFare — 실수령 계산', () => {
  it('요금에서 수수료율만큼 뺀다', () => {
    expect(netFare(10000, 0.2)).toBe(8000)
  })
  it('원 단위로 반올림한다', () => {
    // 12345 × 0.78 = 9629.1 → 9629
    expect(netFare(12345, 0.22)).toBe(9629)
  })
  it('수수료 0이면 요금 그대로', () => {
    expect(netFare(15000, 0)).toBe(15000)
  })
})

describe('turnGapMin — 회전 간격(분)', () => {
  it('같은 날 두 시각의 분 차이', () => {
    expect(turnGapMin('2026-07-19T21:00:00', '2026-07-19T21:45:00')).toBe(45)
  })
  it('자정을 넘겨도 정확히 계산한다', () => {
    // 23:30 → 다음날 00:15 = 45분
    expect(turnGapMin('2026-07-19T23:30:00', '2026-07-20T00:15:00')).toBe(45)
  })
  it('순서가 뒤집히면 음수를 그대로 반환한다', () => {
    expect(turnGapMin('2026-07-19T21:45:00', '2026-07-19T21:00:00')).toBe(-45)
  })
})

describe('businessDay — 오전 6시 영업일 경계', () => {
  it('새벽 2시 기록은 전날 영업일로 귀속', () => {
    expect(businessDay('2026-07-19T02:00:00')).toBe('2026-07-18')
  })
  it('정확히 06시는 당일 영업일', () => {
    expect(businessDay('2026-07-19T06:00:00')).toBe('2026-07-19')
  })
  it('05시 59분은 아직 전날 영업일', () => {
    expect(businessDay('2026-07-19T05:59:00')).toBe('2026-07-18')
  })
  it('낮 시각은 당일 영업일', () => {
    expect(businessDay('2026-07-19T22:00:00')).toBe('2026-07-19')
  })
})

describe('businessWeekday — 영업일 기준 요일', () => {
  it('일요일 새벽 2시는 전날(토요일=6) 요일로 귀속', () => {
    // 2026-07-19는 일요일 → 그 새벽 2시는 영업일상 토요일(6)
    expect(businessWeekday('2026-07-19T02:00:00')).toBe(6)
  })
  it('일요일 낮은 일요일(0)', () => {
    expect(businessWeekday('2026-07-19T20:00:00')).toBe(0)
  })
})

describe('splitSessions — 세션 컷과 막콜', () => {
  const gap = 120

  it('간격이 기준 이하면 같은 세션으로 묶는다', () => {
    const trips = [
      trip('a', '2026-07-19T20:00:00'),
      trip('b', '2026-07-19T20:40:00'), // +40분
      trip('c', '2026-07-19T21:30:00'), // +50분
    ]
    const sessions = splitSessions(trips, gap)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].trips.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(sessions[0].lastCallId).toBe('c') // 세션 마지막 = 막콜
  })

  it('간격이 기준을 넘으면 세션을 끊는다', () => {
    const trips = [
      trip('a', '2026-07-19T20:00:00'),
      trip('b', '2026-07-19T20:30:00'), // +30분 (같은 세션)
      trip('c', '2026-07-19T23:00:00'), // +150분 (>120, 컷)
    ]
    const sessions = splitSessions(trips, gap)
    expect(sessions).toHaveLength(2)
    expect(sessions[0].lastCallId).toBe('b') // 첫 세션 막콜
    expect(sessions[1].lastCallId).toBe('c') // 둘째 세션 막콜(마지막 기록도 막콜)
  })

  it('경계값: 정확히 120분은 컷하지 않는다(> 기준일 때만 컷)', () => {
    const trips = [
      trip('a', '2026-07-19T20:00:00'),
      trip('b', '2026-07-19T22:00:00'), // 정확히 120분
    ]
    expect(splitSessions(trips, gap)).toHaveLength(1)
  })

  it('입력이 시간순이 아니어도 정렬 후 처리한다', () => {
    const trips = [
      trip('c', '2026-07-19T21:30:00'),
      trip('a', '2026-07-19T20:00:00'),
      trip('b', '2026-07-19T20:40:00'),
    ]
    const sessions = splitSessions(trips, gap)
    expect(sessions[0].trips.map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('sessionDurationMin — 세션 시간', () => {
  it('첫 기록과 마지막 기록의 분 차이', () => {
    const trips = [
      trip('a', '2026-07-19T20:00:00'),
      trip('b', '2026-07-19T21:30:00'),
    ]
    const [session] = splitSessions(trips, 120)
    expect(sessionDurationMin(session)).toBe(90)
  })
  it('기록 1건짜리 세션은 0(시급 계산 제외 대상)', () => {
    const [session] = splitSessions([trip('a', '2026-07-19T20:00:00')], 120)
    expect(sessionDurationMin(session)).toBe(0)
  })
})

describe('dailyNetProfit — 일 순수익', () => {
  it('실수령 합에서 경비를 뺀다', () => {
    expect(dailyNetProfit(80000, 12000)).toBe(68000)
  })
})
