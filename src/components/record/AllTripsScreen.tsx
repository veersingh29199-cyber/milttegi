import { useMemo, useState } from 'react'
import type { Settings, Trip } from '../../types/models'
import { filterHistory, groupHistoryByDay, historyNetTotal } from '../../lib/history'
import { TripList } from './TripList'

export function AllTripsScreen({
  settings,
  trips,
  onClose,
  onEdit,
  onDelete,
}: {
  settings: Settings
  trips: Trip[]
  onClose: () => void
  onEdit: (trip: Trip) => void
  onDelete: (id: string) => void
}) {
  const [month, setMonth] = useState('')
  const [platformId, setPlatformId] = useState('all')
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(
    () => filterHistory(trips, { month, platformId, keyword }),
    [trips, month, platformId, keyword],
  )
  const days = useMemo(() => groupHistoryByDay(filtered, settings), [filtered, settings])
  const total = useMemo(() => historyNetTotal(filtered, settings), [filtered, settings])

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-5 pb-24">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">전체 운행 내역</h1>
          <p className="mt-1 text-sm text-neutral-400">{filtered.length}건 · 실수령 {total.toLocaleString()}원</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 shrink-0 rounded-lg border border-neutral-700 px-3 text-sm font-semibold text-neutral-300 active:bg-neutral-800"
        >
          닫기
        </button>
      </header>

      <section className="border-y border-neutral-800 py-4" aria-label="운행내역 필터">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">월 선택</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => setMonth('')}
            className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${
              month ? 'border-neutral-700 text-neutral-300' : 'border-emerald-500 bg-emerald-600 text-white'
            }`}
          >
            전체 기간
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlatformId('all')}
            className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
              platformId === 'all' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-300'
            }`}
          >
            전체 플랫폼
          </button>
          {settings.platforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => setPlatformId(platform.id)}
              className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
                platformId === platform.id
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              {platform.name}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="sr-only">지역 검색</span>
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="출발지 또는 도착지 검색"
            className="min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-white placeholder:text-neutral-500"
          />
        </label>
      </section>

      {days.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">조건에 맞는 운행이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.date}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-base font-bold text-white">{day.date.replaceAll('-', '. ')}</h2>
                <span className="shrink-0 text-sm font-semibold text-emerald-400">
                  {day.trips.length}건 · {day.net.toLocaleString()}원
                </span>
              </div>
              <TripList trips={day.trips} settings={settings} onEdit={onEdit} onDelete={onDelete} ariaLabel={`${day.date} 운행 기록`} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
