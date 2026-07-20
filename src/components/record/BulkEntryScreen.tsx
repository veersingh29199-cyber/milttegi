import { useMemo, useRef, useState } from 'react'
import type { Settings, Trip } from '../../types/models'
import { getDailyExpenses, saveDailyExpenses } from '../../storage/store'
import { atForBusinessDay, nowLocalISO, formatHm } from '../../lib/time'
import { businessDay } from '../../lib/calc'
import { newId } from '../../lib/id'
import { lastPlatformId } from '../../lib/recent'
import { districtName } from '../../data/regions'
import { PlatformChips } from './PlatformChips'
import { RegionField } from './RegionField'
import { FareInput } from './FareInput'
import { Toggle } from './ToggleRow'

// 몰아입력 모드: 놓친 날의 운행내역을 날짜 고정한 채 빠르게 옮겨 적는다.
// 저장하면 다음 건으로 넘어가고, 직전 도착지가 다음 출발지로 자동 제안된다.
export function BulkEntryScreen({
  settings,
  trips,
  addTrip,
  onClose,
}: {
  settings: Settings
  trips: Trip[]
  addTrip: (t: Trip) => void
  onClose: () => void
}) {
  // 고정 영업일(기본: 오늘 영업일). 'YYYY-MM-DD'
  const [businessDate, setBusinessDate] = useState(() => businessDay(nowLocalISO()))
  const [time, setTime] = useState('21:00')
  const [platformId, setPlatformId] = useState(
    () => lastPlatformId(trips) ?? settings.platforms[0]?.id ?? '',
  )
  const [from, setFrom] = useState('')
  const [fromZone, setFromZone] = useState<string | undefined>()
  const [to, setTo] = useState('')
  const [toZone, setToZone] = useState<string | undefined>()
  const [fare, setFare] = useState(0)
  const [rain, setRain] = useState(false)
  const [event, setEvent] = useState(false)
  const [addedIds, setAddedIds] = useState<string[]>([]) // 이번 세션에 추가한 기록 id
  const [expense, setExpense] = useState<number>(() => getDailyExpenses()[businessDay(nowLocalISO())] ?? 0)
  const [toast, setToast] = useState('')
  // 참고용 스크린샷(자동 인식 안 함, 저장 안 함, 세션 중 화면에만 표시).
  const [shot, setShot] = useState<string | null>(null)
  const shotRef = useRef<HTMLInputElement>(null)

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1400)
  }

  // 이번 세션에 방금 추가한 기록들(시간 오름차순)을 화면에 보여준다.
  const addedTrips = useMemo(
    () =>
      trips
        .filter((t) => addedIds.includes(t.id))
        .sort((a, b) => a.at.localeCompare(b.at)),
    [trips, addedIds],
  )

  const handleSave = () => {
    if (!from || !to) {
      flash('출발지·도착지를 선택하세요')
      return
    }
    if (fare <= 0) {
      flash('요금을 입력하세요')
      return
    }
    const trip: Trip = {
      id: newId(),
      at: atForBusinessDay(businessDate, time),
      platformId,
      from,
      to,
      fromZone,
      toZone,
      fare,
      rain,
      event,
    }
    addTrip(trip)
    setAddedIds((ids) => [...ids, trip.id])
    // 다음 건: 직전 도착지를 출발지로 승계, 도착·요금·토글 초기화.
    setFrom(to)
    setFromZone(toZone)
    setTo('')
    setToZone(undefined)
    setFare(0)
    setRain(false)
    setEvent(false)
    flash('저장 · 다음 건 입력')
    navigator.vibrate?.(20)
  }

  // 오늘 경비 저장(영업일 기준).
  const handleExpense = (v: number) => {
    setExpense(v)
    const map = getDailyExpenses()
    if (v > 0) map[businessDate] = v
    else delete map[businessDate]
    saveDailyExpenses(map)
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-4 pb-28">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">몰아입력</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shotRef.current?.click()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            📷 스크린샷
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            완료
          </button>
        </div>
        <input
          ref={shotRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              if (shot) URL.revokeObjectURL(shot)
              setShot(URL.createObjectURL(file))
            }
            e.target.value = ''
          }}
        />
      </div>

      {/* 참고용 스크린샷: 화면 상단에 고정. 앱이 자동으로 읽지 않고, 보며 아래에 입력한다. */}
      {shot && (
        <div className="sticky top-0 z-10 -mx-4 border-b border-neutral-800 bg-neutral-950/95 px-4 py-2 backdrop-blur">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-neutral-500">참고 스크린샷 (보며 아래에 입력)</span>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(shot)
                setShot(null)
              }}
              className="text-xs text-neutral-400"
            >
              닫기 ✕
            </button>
          </div>
          <a href={shot} target="_blank" rel="noopener">
            <img
              src={shot}
              alt="참고 스크린샷"
              className="max-h-56 w-full rounded-lg object-contain"
            />
          </a>
        </div>
      )}

      {/* 고정 날짜 */}
      <div className="flex items-center justify-between rounded-lg bg-neutral-900 px-3 py-2">
        <span className="text-sm text-neutral-300">영업일(고정)</span>
        <input
          type="date"
          aria-label="영업일"
          value={businessDate}
          onChange={(e) => {
            setBusinessDate(e.target.value)
            setExpense(getDailyExpenses()[e.target.value] ?? 0)
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-white"
        />
      </div>

      {/* 시각 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-300">시각</span>
        <input
          type="time"
          aria-label="시각"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-white tabular-nums"
        />
      </div>

      <PlatformChips platforms={settings.platforms} value={platformId} onChange={setPlatformId} />

      <RegionField
        label="출발지"
        value={from}
        zoneValue={fromZone}
        settings={settings}
        recentCodes={[]}
        onPick={(code, zoneId) => {
          setFrom(code)
          setFromZone(zoneId)
        }}
      />
      <RegionField
        label="도착지"
        value={to}
        zoneValue={toZone}
        settings={settings}
        recentCodes={[]}
        onPick={(code, zoneId) => {
          setTo(code)
          setToZone(zoneId)
        }}
      />

      <FareInput value={fare} onChange={setFare} />

      <div className="flex gap-2">
        <Toggle label="비" on={rain} onToggle={() => setRain((v) => !v)} />
        <Toggle label="행사일" on={event} onToggle={() => setEvent((v) => !v)} />
      </div>

      {/* 이번 세션 추가분 */}
      {addedTrips.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-300">
            이번에 추가 <span className="text-neutral-500">({addedTrips.length}건)</span>
          </h2>
          <ul className="flex flex-col gap-1 text-sm" aria-label="이번 세션 추가 기록">
            {addedTrips.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-neutral-900 px-3 py-2"
              >
                <span className="text-neutral-300">
                  <span className="tabular-nums text-neutral-500">{formatHm(t.at)}</span>{' '}
                  {districtName(t.from)} → {districtName(t.to)}
                </span>
                <span className="tabular-nums text-neutral-400">{t.fare.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 오늘 경비 */}
      <section className="rounded-lg bg-neutral-900 p-3">
        <label className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">오늘 경비(유류비 등)</span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              aria-label="오늘 경비"
              value={expense || ''}
              placeholder="0"
              onChange={(e) => handleExpense(Math.max(0, Number(e.target.value) || 0))}
              className="w-28 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-right text-sm text-white tabular-nums"
            />
            <span className="text-sm text-neutral-400">원</span>
          </span>
        </label>
      </section>

      {/* 하단 고정 저장 */}
      <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-800 bg-neutral-950/95 p-3 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          className="mx-auto block w-full max-w-md rounded-xl bg-emerald-600 py-3 text-base font-bold text-white active:bg-emerald-700"
        >
          저장하고 다음 건
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-32 z-30 flex justify-center">
          <span className="rounded-full bg-neutral-800/95 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </span>
        </div>
      )}
    </div>
  )
}
