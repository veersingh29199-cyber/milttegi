import { useMemo, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useTrips } from '../../hooks/useTrips'
import { nowLocalISO } from '../../lib/time'
import { businessDay } from '../../lib/calc'
import { newId } from '../../lib/id'
import { recentDistrictCodes, lastPlatformId } from '../../lib/recent'
import type { Trip } from '../../types/models'
import { TimeField } from './TimeField'
import { PlatformChips } from './PlatformChips'
import { RegionField } from './RegionField'
import { FareInput } from './FareInput'
import { Toggle } from './ToggleRow'
import { TripList } from './TripList'
import { BulkEntryScreen } from './BulkEntryScreen'

// 기록 탭 메인 화면. 위→아래로 시각·플랫폼·출발·도착·요금·토글, 하단 고정 저장.
export function RecordScreen() {
  const settings = useSettings()
  const { trips, addTrip, updateTrip, deleteTrip } = useTrips()

  // 몰아입력 모드 여부(기록 탭 안에서 전환).
  const [bulk, setBulk] = useState(false)

  // --- 입력 폼 상태 ---
  const [at, setAt] = useState(nowLocalISO)
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  // 오늘(영업일 기준) 기록만, 최신순으로.
  const today = businessDay(nowLocalISO())
  const todayTrips = useMemo(
    () =>
      trips
        .filter((t) => businessDay(t.at) === today)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [trips, today],
  )
  const recentCodes = useMemo(() => recentDistrictCodes(trips), [trips])

  // 잠깐 뜨는 안내(토스트).
  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1600)
  }

  // 폼을 새 입력 상태로 되돌린다(플랫폼은 유지, 시각은 지금으로).
  const resetForm = () => {
    setAt(nowLocalISO())
    setFrom('')
    setFromZone(undefined)
    setTo('')
    setToZone(undefined)
    setFare(0)
    setRain(false)
    setEvent(false)
    setEditingId(null)
  }

  // 저장(신규 또는 수정).
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
      id: editingId ?? newId(),
      at,
      platformId,
      from,
      to,
      fromZone,
      toZone,
      fare,
      rain,
      event,
    }
    if (editingId) {
      updateTrip(trip)
      flash('수정했어요')
    } else {
      addTrip(trip)
      flash('저장했어요 ✓')
    }
    // 저장 손맛(지원 기기에서만 진동).
    navigator.vibrate?.(30)
    resetForm()
  }

  // 목록 항목을 폼으로 불러와 수정 모드로.
  const startEdit = (trip: Trip) => {
    setEditingId(trip.id)
    setAt(trip.at)
    setPlatformId(trip.platformId)
    setFrom(trip.from)
    setFromZone(trip.fromZone)
    setTo(trip.to)
    setToZone(trip.toZone)
    setFare(trip.fare)
    setRain(trip.rain)
    setEvent(trip.event)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 몰아입력 모드면 전용 화면으로 대체(놓친 날 몰아 기록).
  if (bulk) {
    return (
      <BulkEntryScreen
        settings={settings}
        trips={trips}
        addTrip={addTrip}
        onClose={() => setBulk(false)}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-4 pb-40">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">기록</h1>
        <button
          type="button"
          onClick={() => setBulk(true)}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
        >
          몰아입력
        </button>
      </div>
      <TimeField value={at} onChange={setAt} />

      <PlatformChips platforms={settings.platforms} value={platformId} onChange={setPlatformId} />

      <RegionField
        label="출발지"
        value={from}
        zoneValue={fromZone}
        settings={settings}
        recentCodes={recentCodes}
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
        recentCodes={recentCodes}
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

      <section className="mt-2">
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">
          오늘 기록 <span className="text-neutral-500">({todayTrips.length}건)</span>
        </h2>
        <TripList
          trips={todayTrips}
          settings={settings}
          onEdit={startEdit}
          onDelete={deleteTrip}
        />
      </section>

      {/* 하단 고정 저장 바(탭바 위). 한 손 엄지 위치. */}
      <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-800 bg-neutral-950/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-300"
            >
              취소
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-base font-bold text-white active:bg-emerald-700"
          >
            {editingId ? '수정 저장' : '저장'}
          </button>
        </div>
      </div>

      {/* 토스트 */}
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
