import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../storage/store'
import type { Trip } from '../types/models'
import { analyzeBoard } from './boardAnalysis'

const trip = (id: string, at: string, fare: number, from = '26440', to = '48250'): Trip => ({
  id,
  at,
  fare,
  from,
  to,
  platformId: 'kakao',
  rain: false,
  event: false,
})

describe('작전판 분석', () => {
  it('오늘 목표와 평균 회전을 계산한다', () => {
    const analysis = analyzeBoard(
      [
        trip('1', '2026-07-22T20:00:00', 20_000),
        trip('2', '2026-07-22T20:30:00', 30_000),
        trip('3', '2026-07-22T21:10:00', 25_000),
      ],
      DEFAULT_SETTINGS,
      '2026-07-22T22:00:00',
    )

    expect(analysis.todayNet).toBe(75_000)
    expect(analysis.averageNet).toBe(25_000)
    expect(analysis.targetLeft).toBe(25_000)
    expect(analysis.callsLeft).toBe(1)
    expect(analysis.averageTurnMin).toBe(35)
  })

  it('오전 6시 전 기록을 전날 영업일에 포함한다', () => {
    const analysis = analyzeBoard(
      [trip('1', '2026-07-23T01:00:00', 20_000)],
      DEFAULT_SETTINGS,
      '2026-07-23T02:00:00',
    )

    expect(analysis.todayTrips).toHaveLength(1)
  })
})
