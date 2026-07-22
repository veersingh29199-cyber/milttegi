import type { Settings, Trip } from '../types/models'
import { businessDay, splitSessions, tripNet, turnGapMin } from './calc'

export interface RankedMetric {
  label: string
  count: number
  net: number
  average: number
}

export interface TimeBand extends RankedMetric {
  key: string
}

export interface BoardAnalysis {
  todayTrips: Trip[]
  todayNet: number
  averageNet: number
  targetProgress: number
  targetLeft: number
  callsLeft: number
  averageTurnMin: number | null
  hourlyNet: number | null
  recentTrend: number | null
  topRoute: RankedMetric | null
  topDestination: RankedMetric | null
  bestPlatform: RankedMetric | null
  timeBands: TimeBand[]
  insight: string
  sampleSize: number
}

function rankBy<T>(items: T[], keyOf: (item: T) => string, netOf: (item: T) => number): RankedMetric[] {
  const grouped = new Map<string, { count: number; net: number }>()
  for (const item of items) {
    const key = keyOf(item)
    const current = grouped.get(key) ?? { count: 0, net: 0 }
    grouped.set(key, { count: current.count + 1, net: current.net + netOf(item) })
  }
  return [...grouped.entries()]
    .map(([label, value]) => ({ ...value, label, average: Math.round(value.net / value.count) }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
}

function bandOf(iso: string): { key: string; label: string } {
  const hour = new Date(iso).getHours()
  if (hour >= 18 && hour < 21) return { key: 'early', label: '18–21시' }
  if (hour >= 21) return { key: 'prime', label: '21–24시' }
  if (hour < 3) return { key: 'late', label: '00–03시' }
  if (hour < 6) return { key: 'dawn', label: '03–06시' }
  return { key: 'day', label: '그 외' }
}

export function analyzeBoard(trips: Trip[], settings: Settings, nowISO: string): BoardAnalysis {
  const today = businessDay(nowISO)
  const todayTrips = trips
    .filter((trip) => businessDay(trip.at) === today)
    .sort((a, b) => a.at.localeCompare(b.at))
  const netOf = (trip: Trip) => tripNet(trip.fare, trip.platformId, settings)
  const todayNet = todayTrips.reduce((sum, trip) => sum + netOf(trip), 0)
  const averageNet = todayTrips.length ? Math.round(todayNet / todayTrips.length) : 0
  const targetLeft = Math.max(0, settings.dailyTarget - todayNet)
  const callsLeft = averageNet > 0 ? Math.ceil(targetLeft / averageNet) : 0

  const sessions = splitSessions(todayTrips, settings.sessionGapMin)
  const turnGaps = sessions.flatMap((session) =>
    session.trips.slice(0, -1).map((trip, index) => turnGapMin(trip.at, session.trips[index + 1].at)),
  )
  const validGaps = turnGaps.filter((gap) => gap > 0 && gap <= settings.sessionGapMin)
  const averageTurnMin = validGaps.length
    ? Math.round(validGaps.reduce((sum, gap) => sum + gap, 0) / validGaps.length)
    : null

  const firstAt = todayTrips[0]?.at
  const elapsedHours = firstAt ? Math.max(1, (new Date(nowISO).getTime() - new Date(firstAt).getTime()) / 3_600_000) : 0
  const hourlyNet = firstAt ? Math.round(todayNet / elapsedHours) : null

  const recent = todayTrips.slice(-3)
  const previous = todayTrips.slice(-6, -3)
  const recentAverage = recent.length ? recent.reduce((sum, trip) => sum + netOf(trip), 0) / recent.length : 0
  const previousAverage = previous.length ? previous.reduce((sum, trip) => sum + netOf(trip), 0) / previous.length : 0
  const recentTrend = previous.length && previousAverage > 0
    ? Math.round(((recentAverage - previousAverage) / previousAverage) * 100)
    : null

  const history = [...trips].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100)
  const topRoute = rankBy(history, (trip) => `${trip.from} → ${trip.to}`, netOf)[0] ?? null
  const topDestination = rankBy(history, (trip) => trip.to, netOf)[0] ?? null
  const bestPlatformRaw = rankBy(history, (trip) => trip.platformId, netOf)[0] ?? null
  const bestPlatform = bestPlatformRaw
    ? { ...bestPlatformRaw, label: settings.platforms.find((platform) => platform.id === bestPlatformRaw.label)?.name ?? bestPlatformRaw.label }
    : null

  const timeBands = rankBy(todayTrips, (trip) => bandOf(trip.at).key, netOf).map((metric) => ({
    ...metric,
    key: metric.label,
    label: bandOf(todayTrips.find((trip) => bandOf(trip.at).key === metric.label)?.at ?? nowISO).label,
  }))

  let insight = '첫 운행을 기록하면 오늘의 흐름을 분석합니다.'
  if (todayTrips.length >= 6 && recentTrend !== null) {
    insight = recentTrend >= 10
      ? `최근 3건의 건당 수익이 직전보다 ${recentTrend}% 좋아졌습니다. 현재 흐름을 유지하세요.`
      : recentTrend <= -10
        ? `최근 3건의 건당 수익이 직전보다 ${Math.abs(recentTrend)}% 낮습니다. 대기 위치 변경을 검토하세요.`
        : '최근 6건의 건당 수익이 안정적입니다. 회전 간격을 줄이는 데 집중하세요.'
  } else if (todayTrips.length >= 2 && averageTurnMin !== null) {
    insight = `현재 평균 회전은 ${averageTurnMin}분입니다. ${settings.minHourly.toLocaleString()}원 시급 기준과 함께 판단하세요.`
  } else if (todayTrips.length > 0) {
    insight = `${Math.max(0, 3 - todayTrips.length)}건 더 기록하면 최근 흐름과 회전 속도를 비교할 수 있습니다.`
  }

  return {
    todayTrips,
    todayNet,
    averageNet,
    targetProgress: settings.dailyTarget > 0 ? Math.min(100, Math.round((todayNet / settings.dailyTarget) * 100)) : 0,
    targetLeft,
    callsLeft,
    averageTurnMin,
    hourlyNet,
    recentTrend,
    topRoute,
    topDestination,
    bestPlatform,
    timeBands,
    insight,
    sampleSize: history.length,
  }
}
