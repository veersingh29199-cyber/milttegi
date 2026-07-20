import { describe, it, expect } from 'vitest'
import { atForBusinessDay } from './time'
import { businessDay } from './calc'

describe('atForBusinessDay — 몰아입력 영업일+시각 → at', () => {
  it('낮/저녁 시각은 같은 달력일', () => {
    expect(atForBusinessDay('2026-07-20', '21:30')).toBe('2026-07-20T21:30:00')
  })
  it('06시 정각은 같은 날', () => {
    expect(atForBusinessDay('2026-07-20', '06:00')).toBe('2026-07-20T06:00:00')
  })
  it('새벽(06시 이전)은 달력상 다음 날로 넘긴다', () => {
    // 영업일 07-20의 새벽 2시는 달력상 07-21
    expect(atForBusinessDay('2026-07-20', '02:00')).toBe('2026-07-21T02:00:00')
  })
  it('월말 새벽은 다음 달로 정확히 넘어간다', () => {
    expect(atForBusinessDay('2026-07-31', '03:00')).toBe('2026-08-01T03:00:00')
  })
  it('만든 at을 businessDay로 되돌리면 원래 영업일과 같다', () => {
    const at = atForBusinessDay('2026-07-20', '02:00')
    expect(businessDay(at)).toBe('2026-07-20')
  })
})
