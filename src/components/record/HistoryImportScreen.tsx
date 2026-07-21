import { useMemo, useRef, useState } from 'react'
import type { Settings, Trip } from '../../types/models'
import { parseScreenshot, type RecognizedTrip } from '../../lib/parseScreenshot'
import { makeImportCandidates } from '../../lib/historyImport'
import { newId } from '../../lib/id'
import { nowLocalISO } from '../../lib/time'

export function HistoryImportScreen({
  settings,
  trips,
  addTrips,
  onClose,
}: {
  settings: Settings
  trips: Trip[]
  addTrips: (trips: Trip[]) => void
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fallbackDate, setFallbackDate] = useState(() => nowLocalISO().slice(0, 10))
  const [recognized, setRecognized] = useState<RecognizedTrip[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [message, setMessage] = useState('')

  const fallbackPlatformId = settings.platforms[0]?.id ?? 'kakao'
  const candidates = useMemo(
    () =>
      makeImportCandidates({
        recognized,
        fallbackDate,
        fallbackPlatformId,
        knownPlatformIds: settings.platforms.map((platform) => platform.id),
        existingTrips: trips,
        createId: newId,
      }),
    [recognized, fallbackDate, fallbackPlatformId, settings.platforms, trips],
  )
  const readyCandidates = candidates.filter((candidate) => candidate.trip)
  const selectedTrips = candidates
    .filter((candidate) => candidate.trip && selected.has(candidate.key))
    .flatMap((candidate) => (candidate.trip ? [candidate.trip] : []))

  const flash = (next: string) => {
    setMessage(next)
    window.setTimeout(() => setMessage(''), 1800)
  }

  const runParse = async (file: File) => {
    setParsing(true)
    setRecognized([])
    setSelected(new Set())
    try {
      const result = await parseScreenshot(file, settings, fallbackDate)
      setRecognized(result)
      const resultCandidates = makeImportCandidates({
        recognized: result,
        fallbackDate,
        fallbackPlatformId,
        knownPlatformIds: settings.platforms.map((platform) => platform.id),
        existingTrips: trips,
        createId: newId,
      })
      setSelected(new Set(resultCandidates.flatMap((candidate) => (candidate.trip ? [candidate.key] : []))))
      flash(result.length ? `${result.length}건을 읽었어요 · 저장 전 확인하세요` : '읽을 수 있는 운행이 없어요')
    } catch (error) {
      flash(error instanceof Error ? error.message : '사진을 읽지 못했어요')
    } finally {
      setParsing(false)
    }
  }

  const toggle = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const saveSelected = () => {
    if (selectedTrips.length === 0) return
    addTrips(selectedTrips)
    flash(`${selectedTrips.length}건을 팀 기록에 저장했어요`)
    setRecognized([])
    setSelected(new Set())
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-5 pb-28">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">운행내역 사진 불러오기</h1>
          <p className="mt-1 text-sm leading-5 text-neutral-400">카카오 상세 내역과 T맵 목록을 읽어 한 번에 기록합니다.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 shrink-0 rounded-lg border border-neutral-700 px-3 text-sm font-semibold text-neutral-300 active:bg-neutral-800"
        >
          닫기
        </button>
      </header>

      <section className="border-y border-neutral-800 py-5">
        <label className="block text-sm font-semibold text-neutral-200" htmlFor="history-import-date">
          날짜 기준
        </label>
        <p className="mt-1 text-xs leading-5 text-neutral-500">카카오 화면처럼 연도가 없는 사진에만 적용됩니다.</p>
        <input
          id="history-import-date"
          type="date"
          value={fallbackDate}
          onChange={(event) => setFallbackDate(event.target.value)}
          className="mt-3 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className="mt-3 flex min-h-14 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-base font-bold text-white active:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {parsing ? '사진 읽는 중...' : '운행내역 사진 선택'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void runParse(file)
            event.target.value = ''
          }}
        />
      </section>

      {recognized.length > 0 && (
        <section aria-label="사진 인식 결과">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">저장할 운행</h2>
            <span className="text-sm font-medium text-emerald-400">{selectedTrips.length}건 선택</span>
          </div>
          <div className="flex flex-col gap-2">
            {candidates.map((candidate) => {
              const { source, trip, reason } = candidate
              const checked = selected.has(candidate.key)
              const platformName = source.platformId === 'tmap' ? '티맵' : source.platformId === 'kakao' ? '카카오' : '플랫폼 확인'
              return (
                <label
                  key={candidate.key}
                  className={`flex min-h-22 items-center gap-3 rounded-lg border p-3 ${
                    trip
                      ? checked
                        ? 'border-emerald-600 bg-emerald-950/25'
                        : 'border-neutral-700 bg-neutral-900'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!trip}
                    onChange={() => toggle(candidate.key)}
                    className="h-5 w-5 shrink-0 accent-emerald-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">
                        {source.dateISO || fallbackDate} {source.timeHHmm || '--:--'}
                      </span>
                      <span className="text-base font-bold text-white tabular-nums">{source.fare.toLocaleString()}원</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-neutral-300">
                      {source.fromText || '?'} → {source.toText || '?'}
                    </p>
                    {trip ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        {platformName}
                        {source.paymentMethod === 'cash' ? ' · 현금' : source.paymentMethod === 'card' ? ' · 카드' : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-400">{reason}</p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </section>
      )}

      {recognized.length > 0 && readyCandidates.length === 0 && (
        <p className="text-sm text-amber-400">바로 저장할 수 있는 운행이 없어요. 사진이 흐리지 않은지 확인하세요.</p>
      )}

      <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-800 bg-[#0b0f14]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          <button
            type="button"
            onClick={saveSelected}
            disabled={selectedTrips.length === 0}
            className="min-h-14 w-full rounded-lg bg-emerald-600 px-4 text-base font-bold text-white active:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            {selectedTrips.length ? `${selectedTrips.length}건 기록 저장` : '저장할 운행을 선택하세요'}
          </button>
        </div>
      </div>

      {message && (
        <div className="fixed inset-x-0 bottom-32 z-30 flex justify-center px-4">
          <span className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white shadow-lg">{message}</span>
        </div>
      )}
    </div>
  )
}
