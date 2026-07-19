import regionsJson from './regions.json'
import type { RegionsData, RegionDistrict } from '../types/models'

// 지역 데이터(부산/울산/경남 39개 시군구)를 타입이 붙은 형태로 내보낸다.
export const REGIONS = regionsJson as RegionsData

// 시군구 코드 → 이름 빠른 조회표(예: '26440' → '강서구').
const codeToName = new Map<string, string>()
// 시군구 코드 → 상위 시도 이름(예: '26440' → '부산광역시').
const codeToProvince = new Map<string, string>()
for (const province of REGIONS.provinces) {
  for (const d of province.districts) {
    codeToName.set(d.code, d.name)
    codeToProvince.set(d.code, province.name)
  }
}

// 시군구 코드로 이름을 찾는다. 없으면 코드 자체를 돌려준다(깨지지 않게).
export function districtName(code: string): string {
  return codeToName.get(code) ?? code
}

// 시군구 코드로 상위 시도 이름을 찾는다.
export function provinceOf(code: string): string | undefined {
  return codeToProvince.get(code)
}

// 전체 시군구를 평평한 배열로 반환(검색·목록용).
export function allDistricts(): RegionDistrict[] {
  return REGIONS.provinces.flatMap((p) => p.districts)
}

// 지역 개수 자체 검증: 부산16 / 울산5 / 경남18 = 총 39.
// 목록을 실수로 빠뜨리거나 중복하면 개발 중 콘솔에서 바로 잡히게 한다.
export interface RegionCountCheck {
  ok: boolean
  counts: Record<string, number>
  total: number
  duplicates: string[]
}
export function verifyRegionCounts(): RegionCountCheck {
  const expected: Record<string, number> = { 부산광역시: 16, 울산광역시: 5, 경상남도: 18 }
  const counts: Record<string, number> = {}
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const p of REGIONS.provinces) {
    counts[p.name] = p.districts.length
    for (const d of p.districts) {
      if (seen.has(d.code)) duplicates.push(d.code)
      seen.add(d.code)
    }
  }
  const total = seen.size
  const ok =
    duplicates.length === 0 &&
    total === 39 &&
    Object.entries(expected).every(([name, n]) => counts[name] === n)
  return { ok, counts, total, duplicates }
}
