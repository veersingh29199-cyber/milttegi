import { useRef, useState } from 'react'
import type { Settings, Trip } from '../../types/models'
import { districtName } from '../../data/regions'
import { formatHm } from '../../lib/time'
import { netFare } from '../../lib/calc'

// 당일 기록 한 줄. 좌로 밀면 뒤에서 삭제 버튼이 나오고, 내용을 탭하면 수정한다.
// 라이브러리 없이 pointer 이벤트로 스와이프를 직접 구현한다(터치·마우스 모두 동작).
function TripRow({
  trip,
  platformName,
  net,
  onEdit,
  onDelete,
}: {
  trip: Trip
  platformName: string
  net: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [offset, setOffset] = useState(0) // 현재 밀린 거리(px, 음수)
  const startX = useRef<number | null>(null)
  const moved = useRef(false)
  const REVEAL = 88 // 삭제 버튼 폭

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX
    moved.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 6) moved.current = true
    // 왼쪽으로만(음수) 최대 REVEAL 까지. 이미 열린 상태에서 오른쪽으로 닫기 허용.
    const base = offset <= -REVEAL ? -REVEAL : 0
    const next = Math.min(0, Math.max(-REVEAL, base + dx))
    setOffset(next)
  }
  const onPointerUp = () => {
    if (startX.current === null) return
    startX.current = null
    setOffset((cur) => (cur < -REVEAL / 2 ? -REVEAL : 0)) // 절반 넘으면 열림 고정
  }
  // 내용 탭(밀지 않았을 때)이면 수정. 열려 있으면 먼저 닫는다.
  const onContentClick = () => {
    if (moved.current) return
    if (offset !== 0) {
      setOffset(0)
      return
    }
    onEdit()
  }

  return (
    <li className="relative overflow-hidden rounded-lg bg-neutral-900">
      {/* 뒤에 숨은 삭제 버튼 */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex items-center bg-red-600 px-4 text-sm font-semibold text-white"
        style={{ width: REVEAL }}
      >
        삭제
      </button>

      {/* 앞의 내용(밀리는 층) */}
      <div
        className="relative flex items-center justify-between gap-2 bg-neutral-900 px-3 py-2.5 touch-pan-y"
        style={{ transform: `translateX(${offset}px)`, transition: startX.current === null ? 'transform .18s' : 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onContentClick}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-white">
            <span className="tabular-nums text-neutral-400">{formatHm(trip.at)}</span>
            <span className="truncate">
              {districtName(trip.from)} → {districtName(trip.to)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
            <span>{platformName}</span>
            {trip.rain && <span className="text-sky-400">비</span>}
            {trip.event && <span className="text-amber-400">행사</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-white tabular-nums">
            {trip.fare.toLocaleString()}원
          </div>
          <div className="text-xs text-emerald-400 tabular-nums">실 {net.toLocaleString()}</div>
        </div>
      </div>
    </li>
  )
}

export function TripList({
  trips,
  settings,
  onEdit,
  onDelete,
}: {
  trips: Trip[]
  settings: Settings
  onEdit: (trip: Trip) => void
  onDelete: (id: string) => void
}) {
  if (trips.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-600">오늘 기록이 아직 없어요.</p>
  }

  // 플랫폼 id → 이름·수수료율 조회.
  const platformOf = (id: string) => settings.platforms.find((p) => p.id === id)

  return (
    <ul className="flex flex-col gap-2" aria-label="오늘 운행 기록">
      {trips.map((t) => {
        const platform = platformOf(t.platformId)
        return (
          <TripRow
            key={t.id}
            trip={t}
            platformName={platform?.name ?? t.platformId}
            net={netFare(t.fare, platform?.feeRate ?? 0)}
            onEdit={() => onEdit(t)}
            onDelete={() => onDelete(t.id)}
          />
        )
      })}
    </ul>
  )
}
