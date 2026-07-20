import { describe, it, expect } from 'vitest'
import { mergeById } from './useTrips'
import type { Trip } from '../types/models'

// 테스트용 기록 한 건을 만든다.
function trip(id: string, fare = 10000): Trip {
  return {
    id,
    at: '2026-07-19T21:00:00',
    platformId: 'kakao',
    from: '26440',
    to: '26440',
    fare,
    rain: false,
    event: false,
  }
}

describe('mergeById — 화면 목록과 저장본 합치기', () => {
  it('양쪽에만 있는 기록은 모두 살아남는다', () => {
    expect(mergeById([trip('a')], [trip('b')]).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('저장소가 비어 있어도 화면이 든 기록은 사라지지 않는다(누적 실패 방지)', () => {
    expect(mergeById([trip('a'), trip('b')], []).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('같은 id는 저장본(뒤쪽) 내용이 이긴다', () => {
    const merged = mergeById([trip('a', 10000)], [trip('a', 25000)])
    expect(merged).toHaveLength(1)
    expect(merged[0].fare).toBe(25000)
  })
})
