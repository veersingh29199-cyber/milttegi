import type { Trip } from '../types/models'

// 최근 사용한 시군구 코드 목록(최신순, 중복 제거).
// '전체' 바텀시트 상단에 최근 지역을 자동 승격할 때 쓴다.
// 도착지가 다음 콜 출발 후보라 to를 from보다 먼저 반영한다.
export function recentDistrictCodes(trips: Trip[], limit = 6): string[] {
  const sorted = [...trips].sort((a, b) => b.at.localeCompare(a.at))
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of sorted) {
    for (const code of [t.to, t.from]) {
      if (code && !seen.has(code)) {
        seen.add(code)
        out.push(code)
        if (out.length >= limit) return out
      }
    }
  }
  return out
}

// 마지막으로 사용한 플랫폼 id(가장 최근 기록 기준). 없으면 undefined.
export function lastPlatformId(trips: Trip[]): string | undefined {
  let latest: Trip | undefined
  for (const t of trips) {
    if (!latest || t.at.localeCompare(latest.at) > 0) latest = t
  }
  return latest?.platformId
}
