import { describe, it, expect } from 'vitest'
import { verifyRegionCounts, districtName, allDistricts } from './regions'

describe('지역 데이터 무결성', () => {
  it('부산16 / 울산5 / 경남18 = 총 39개, 중복 코드 없음', () => {
    const check = verifyRegionCounts()
    expect(check.ok).toBe(true)
    expect(check.total).toBe(39)
    expect(check.duplicates).toEqual([])
    expect(check.counts).toEqual({ 부산광역시: 16, 울산광역시: 5, 경상남도: 18 })
  })

  it('시군구 코드로 이름을 찾을 수 있다', () => {
    expect(districtName('26440')).toBe('강서구')
    expect(districtName('48250')).toBe('김해시')
  })

  it('모든 코드는 5자리 숫자 문자열이다', () => {
    for (const d of allDistricts()) {
      expect(d.code).toMatch(/^\d{5}$/)
    }
  })
})
