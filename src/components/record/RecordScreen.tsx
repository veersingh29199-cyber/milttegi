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
import { DailyTargetBar } from './DailyTargetBar'
import { RouteFinder } from './RouteFinder'
import { HistoryImportScreen } from './HistoryImportScreen'

// 기록 탭 메인 화면. 위→아래로 시각·플랫폼·출발·도착·요금·토글, 하단 고정 저장.
export function RecordScreen() {
  const settings = useSettings()
  const { trips, addTrip, addTrips, updateTrip, deleteTrip, saveError, syncError } = useTrips()

  // 몰아입력 모드 여부(기록 탭 안에서 전환).
  const [bulk, setBulk] = useState(false)
  const [historyImport, setHistoryImport] = useState(false)

  // --- 입력 폼 상태 ---
  const [at, setAt] = useState(nowLocalISO)
  const [platformId, setPlatformId] = useState(
    () => lastPlatformId(trips) ?? settings.platforms[0]?.id ?? '',
  )
  const [from, setFrom] = useState('')
  const [fromZone, setFromZone] = useState<string | undefined>()
  const [fromDetail, setFromDetail] = useState<string | undefined>()
  const [to, setTo] = useState('')
  const [toZone, setToZone] = useState<string | undefined>()
  const [toDetail, setToDetail] = useState<string | undefined>()
  const [fare, setFare] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<Trip['paymentMethod']>()
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
  const quickFares = useMemo(() => {
    const recent = Array.from(new Set([...trips].sort((a, b) => b.at.localeCompare(a.at)).map((trip) => trip.fare)))
      .filter((fare) => fare > 0)
      .slice(0, 4)
    return recent.length >= 2 ? recent : [10000, 15000, 20000, 25000]
  }, [trips])
  const readyToSave = Boolean(from && to && fare > 0)

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
    setFromDetail(undefined)
    setTo('')
    setToZone(undefined)
    setToDetail(undefined)
    setFare(0)
    setPaymentMethod(undefined)
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
      fromDetail,
      toDetail,
      fare,
      paymentMethod,
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
    setFromDetail(trip.fromDetail)
    setTo(trip.to)
    setToZone(trip.toZone)
    setToDetail(trip.toDetail)
    setFare(trip.fare)
    setPaymentMethod(trip.paymentMethod)
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

  if (historyImport) {
    return (
      <HistoryImportScreen
        settings={settings}
        trips={trips}
        addTrips={addTrips}
        onClose={() => setHistoryImport(false)}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-5 pb-40">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">새 운행 기록</h1>
          <p className="mt-1 text-sm text-neutral-400">경로와 요금만 먼저 입력하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryImport(true)}
            className="min-h-10 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white active:bg-emerald-700"
          >
            사진 불러오기
          </button>
          <button
            type="button"
            onClick={() => setBulk(true)}
            className="min-h-10 rounded-lg border border-neutral-700 px-3 text-sm font-semibold text-neutral-300 active:bg-neutral-800"
          >
            몰아입력
          </button>
        </div>
      </header>

      {/* 저장 실패 경고: 이게 뜨면 기록이 기기에 남지 않으니 즉시 알아야 한다. */}
      {saveError && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          ⚠️ {saveError}
        </p>
      )}
      {syncError && (
        <p className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
          {syncError}
        </p>
      )}

      {/* 목표는 현재 흐름을 방해하지 않게 요약으로만 먼저 보여준다. */}
      <DailyTargetBar trips={trips} settings={settings} />

      <section aria-label="운행 입력" className="border-y border-neutral-800 py-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">운행 정보</h2>
          <span className="text-xs font-medium text-neutral-500">필수 3항목</span>
        </div>

        <div className="flex flex-col gap-5">
          <RegionField
            label="출발지"
            value={from}
            zoneValue={fromZone}
            settings={settings}
            recentCodes={recentCodes}
            onPick={(code, zoneId) => {
              setFrom(code)
              setFromZone(zoneId)
              setFromDetail(undefined)
            }}
          />

          <div className="border-l-2 border-emerald-600/70 pl-3">
            <RegionField
              label="도착지"
              value={to}
              zoneValue={toZone}
              settings={settings}
              recentCodes={recentCodes}
              onPick={(code, zoneId) => {
                setTo(code)
                setToZone(zoneId)
                setToDetail(undefined)
              }}
            />
          </div>

          <div className="border-t border-neutral-800 pt-5">
            <FareInput
              value={fare}
              onChange={setFare}
              quickValues={quickFares}
              subtitle={settings.fareIsNet ? '(실수령)' : '(표시요금)'}
            />
          </div>
        </div>
      </section>

      <details className="group border-b border-neutral-800 pb-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-neutral-300">
          기록 옵션
          <span className="text-lg text-neutral-500 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
        </summary>
        <div className="flex flex-col gap-4 pt-3">
          <TimeField value={at} onChange={setAt} />
          <PlatformChips platforms={settings.platforms} value={platformId} onChange={setPlatformId} />
          <div className="flex gap-2">
            <Toggle label="비" on={rain} onToggle={() => setRain((v) => !v)} />
            <Toggle label="행사일" on={event} onToggle={() => setEvent((v) => !v)} />
          </div>
          <RouteFinder />
        </div>
      </details>

      <section className="mt-2">
        <h2 className="mb-3 text-base font-bold text-white">
          오늘 기록{' '}
          <span className="text-neutral-500">
            ({todayTrips.length}건 · 전체 {trips.length}건)
          </span>
        </h2>
        <TripList
          trips={todayTrips}
          settings={settings}
          onEdit={startEdit}
          onDelete={deleteTrip}
        />
      </section>

      {/* 하단 고정 저장 바(탭바 위). 한 손 엄지 위치. */}
      <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-800 bg-[#0b0f14]/95 p-3 backdrop-blur">
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
            disabled={!readyToSave}
            className="min-h-14 flex-1 rounded-lg bg-emerald-600 px-4 text-base font-bold text-white transition-colors active:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            {editingId ? '수정 저장' : readyToSave ? '기록 저장' : '출발지 · 도착지 · 요금 입력'}
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
