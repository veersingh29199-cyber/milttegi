import { tripNet } from './calc'
import type { Settings, Trip } from '../types/models'

export interface HistoryFilter {
  month: string
  platformId: string
  keyword: string
}

function routeText(trip: Trip): string {
  return [trip.fromDetail, trip.toDetail, trip.from, trip.to].filter(Boolean).join(' ').toLowerCase()
}

export function filterHistory(trips: Trip[], filter: HistoryFilter): Trip[] {
  const keyword = filter.keyword.trim().toLowerCase()
  return [...trips]
    .filter((trip) => !filter.month || trip.at.startsWith(filter.month))
    .filter((trip) => filter.platformId === 'all' || trip.platformId === filter.platformId)
    .filter((trip) => !keyword || routeText(trip).includes(keyword))
    .sort((a, b) => b.at.localeCompare(a.at))
}

export interface HistoryDay {
  date: string
  trips: Trip[]
  net: number
}

export function groupHistoryByDay(trips: Trip[], settings: Settings): HistoryDay[] {
  const byDate = new Map<string, Trip[]>()
  for (const trip of trips) {
    const date = trip.at.slice(0, 10)
    byDate.set(date, [...(byDate.get(date) ?? []), trip])
  }
  return [...byDate.entries()].map(([date, dayTrips]) => ({
    date,
    trips: dayTrips,
    net: dayTrips.reduce((sum, trip) => sum + tripNet(trip.fare, trip.platformId, settings), 0),
  }))
}

export function historyNetTotal(trips: Trip[], settings: Settings): number {
  return trips.reduce((sum, trip) => sum + tripNet(trip.fare, trip.platformId, settings), 0)
}
