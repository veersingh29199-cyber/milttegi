import type { Settings, Trip } from '../types/models'
import { splitSessions, netFare, turnGapMin, businessWeekday } from './calc'

// 작전판 집계 전용 순수 함수 모음. UI와 분리해 단위 테스트로 정확성을 고정한다.

// --- 모드(강서/동래) ---
export type Mode = 'gangseo' | 'dongrae'

// 모드 → 출발 시군구 코드. 모드는 "출발지 필터"로 동작한다.
export const MODE_DISTRICT: Record<Mode, string> = {
  gangseo: '26440', // 부산 강서구(평일 밀떼기 무대)
  dongrae: '26260', // 부산 동래구(주말 무대)
}

export const MODE_LABEL: Record<Mode, string> = {
  gangseo: '강서',
  dongrae: '동래',
}

// 영업일 요일 기준 자동 모드: 월~금=강서, 토·일=동래.
export function autoMode(iso: string): Mode {
  const wd = businessWeekday(iso) // 0=일 … 6=토
  return wd === 0 || wd === 6 ? 'dongrae' : 'gangseo'
}

// 모드에 맞는 출발 시군구 기록만 남긴다.
export function filterByMode(trips: Trip[], mode: Mode): Trip[] {
  return trips.filter((t) => t.from === MODE_DISTRICT[mode])
}

// --- 시간대 구간 ---
export type TimeBucket = 'evening' | 'peak' | 'dawn' | 'day'

export const BUCKET_LABEL: Record<TimeBucket, string> = {
  evening: '초저녁 18–21',
  peak: '피크 21–24',
  dawn: '새벽 24–06',
  day: '낮 06–18',
}

// 표시 순서(영업일 흐름). '낮'은 표본이 있을 때만 노출한다.
export const BUCKET_ORDER: TimeBucket[] = ['evening', 'peak', 'dawn', 'day']

// 기록 시각의 시(hour)로 시간대 구간을 정한다.
export function timeBucket(iso: string): TimeBucket {
  const hour = Number(iso.slice(11, 13))
  if (hour >= 18 && hour < 21) return 'evening'
  if (hour >= 21 && hour < 24) return 'peak'
  if (hour < 6) return 'dawn' // 0~5시
  return 'day' // 6~17시(드묾)
}

// 주중/주말 그룹(영업일 요일 기준).
export type DayGroup = 'weekday' | 'weekend'
export function dayGroup(iso: string): DayGroup {
  const wd = businessWeekday(iso)
  return wd === 0 || wd === 6 ? 'weekend' : 'weekday'
}

// --- 기록별 파생값(회전 간격·실수령) ---
export interface TripDerived {
  trip: Trip
  net: number // 실수령
  gapMin: number | null // 다음 기록까지 회전 간격(세션 마지막=막콜은 null)
}

// 각 기록의 실수령과 "다음 기록까지 회전 간격"을 계산한다.
// 회전 간격은 세션 경계를 넘지 않으며, 막콜(세션 마지막)은 null이다.
export function deriveTrips(trips: Trip[], settings: Settings): TripDerived[] {
  const feeRateOf = (platformId: string) =>
    settings.platforms.find((p) => p.id === platformId)?.feeRate ?? 0

  const sessions = splitSessions(trips, settings.sessionGapMin)
  const out: TripDerived[] = []
  for (const session of sessions) {
    const list = session.trips
    for (let i = 0; i < list.length; i++) {
      const t = list[i]
      const isLast = i === list.length - 1 // 막콜
      out.push({
        trip: t,
        net: netFare(t.fare, feeRateOf(t.platformId)),
        gapMin: isLast ? null : turnGapMin(t.at, list[i + 1].at),
      })
    }
  }
  return out
}

// --- 한 칸(cell) 집계 ---
export interface CellStat {
  count: number // 칸에 속한 전체 기록 수(표시용)
  avgGapMin: number | null // 평균 회전 간격(회전 데이터가 있을 때만)
  hourlyNet: number | null // 시간당 실수령(원)
}

// 표본이 이 값 미만이면 회색 처리하고 값 대신 건수만 보여준다.
export const MIN_SAMPLE = 3
// 칸이 이 값 이상으로 두터워지면 고해상도(1시간×요일)로 세분화한다.
export const REFINE_SAMPLE = 5

// 파생 기록 묶음을 한 칸으로 집계한다.
// 시간당 실수령 = (회전 있는 기록 실수령 합) / (회전 간격 합) × 60.
// 막콜은 뒤 시간이 없어 시급 분모에서 빠진다(계산 규칙과 일관).
export function aggregateCell(items: TripDerived[]): CellStat {
  const count = items.length
  const withGap = items.filter((d) => d.gapMin !== null && d.gapMin > 0)
  if (withGap.length === 0) {
    return { count, avgGapMin: null, hourlyNet: null }
  }
  const gapSum = withGap.reduce((s, d) => s + (d.gapMin as number), 0)
  const netSum = withGap.reduce((s, d) => s + d.net, 0)
  return {
    count,
    avgGapMin: Math.round(gapSum / withGap.length),
    hourlyNet: Math.round((netSum / gapSum) * 60),
  }
}

// --- 적응형 그리드 ---
export interface CoarseGrid {
  resolution: 'coarse'
  buckets: TimeBucket[] // 표본이 있는 시간대만
  cells: Record<TimeBucket, Record<DayGroup, CellStat>>
}

// coarse: 행=시간대, 열=주중/주말.
export function coarseGrid(derived: TripDerived[]): CoarseGrid {
  const groups: Record<string, TripDerived[]> = {}
  for (const d of derived) {
    const key = `${timeBucket(d.trip.at)}|${dayGroup(d.trip.at)}`
    ;(groups[key] ??= []).push(d)
  }
  const cells = {} as CoarseGrid['cells']
  const present = new Set<TimeBucket>()
  for (const bucket of BUCKET_ORDER) {
    cells[bucket] = {
      weekday: aggregateCell(groups[`${bucket}|weekday`] ?? []),
      weekend: aggregateCell(groups[`${bucket}|weekend`] ?? []),
    }
    if (cells[bucket].weekday.count + cells[bucket].weekend.count > 0) present.add(bucket)
  }
  // '낮'은 표본이 있을 때만 노출. 나머지 기본 3구간은 항상 노출.
  const buckets = BUCKET_ORDER.filter((b) => b !== 'day' || present.has('day'))
  return { resolution: 'coarse', buckets, cells }
}

// 데이터가 충분히 두터운지: coarse 활성 칸이 4개 이상이고 모두 REFINE_SAMPLE 이상.
export function shouldRefine(derived: TripDerived[]): boolean {
  const grid = coarseGrid(derived)
  const active: CellStat[] = []
  for (const b of grid.buckets) {
    for (const g of ['weekday', 'weekend'] as DayGroup[]) {
      if (grid.cells[b][g].count > 0) active.push(grid.cells[b][g])
    }
  }
  return active.length >= 4 && active.every((c) => c.count >= REFINE_SAMPLE)
}

export interface FineGrid {
  resolution: 'fine'
  hours: number[] // 표본이 있는 시(hour) 오름차순(영업일 흐름: 18→…→5)
  weekdays: number[] // 0~6 중 표본이 있는 요일
  cells: Record<string, CellStat> // 키: `${hour}|${weekday}`
}

// 영업일 흐름 순서로 시(hour)를 정렬(18시 시작 → 자정 넘겨 5시까지 → 낮).
function businessHourOrder(hour: number): number {
  return (hour + 6) % 24 // 6시를 0으로 당김 → 06시가 맨 앞, 05시가 맨 뒤
}

// fine: 행=요일, 열=시(1시간). 표본 있는 행·열만 남긴다.
export function fineGrid(derived: TripDerived[]): FineGrid {
  const groups: Record<string, TripDerived[]> = {}
  const hourSet = new Set<number>()
  const wdSet = new Set<number>()
  for (const d of derived) {
    const hour = Number(d.trip.at.slice(11, 13))
    const wd = businessWeekday(d.trip.at)
    hourSet.add(hour)
    wdSet.add(wd)
    ;(groups[`${hour}|${wd}`] ??= []).push(d)
  }
  const cells: Record<string, CellStat> = {}
  for (const key in groups) cells[key] = aggregateCell(groups[key])
  const hours = [...hourSet].sort((a, b) => businessHourOrder(a) - businessHourOrder(b))
  const weekdays = [...wdSet].sort((a, b) => a - b)
  return { resolution: 'fine', hours, weekdays, cells }
}

// 데이터 양에 따라 coarse/fine 그리드를 자동 선택한다.
export function adaptiveGrid(trips: Trip[], settings: Settings): CoarseGrid | FineGrid {
  const derived = deriveTrips(trips, settings)
  return shouldRefine(derived) ? fineGrid(derived) : coarseGrid(derived)
}
