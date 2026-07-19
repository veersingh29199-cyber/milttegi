import { useMemo, useState } from 'react'
import { useTrips } from '../../hooks/useTrips'
import { useSettings } from '../../hooks/useSettings'
import { nowLocalISO } from '../../lib/time'
import {
  autoMode,
  filterByMode,
  adaptiveGrid,
  BUCKET_LABEL,
  MIN_SAMPLE,
  MODE_LABEL,
  type Mode,
  type CellStat,
  type CoarseGrid,
  type FineGrid,
} from '../../lib/board'

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토']
const UNLOCK_AT = 10 // 이 건수부터 작전판이 열린다

// 작전판 탭. 4-A: 잠금 + 요일 모드 + 적응형 해상도 표.
// 위젯·전용 리포트는 4-B/4-C에서 이어 붙인다.
export function BoardScreen() {
  const { trips } = useTrips()
  const settings = useSettings()
  const [override, setOverride] = useState<Mode | null>(null)

  const auto = autoMode(nowLocalISO())
  const mode = override ?? auto

  const grid = useMemo(
    () => adaptiveGrid(filterByMode(trips, mode), settings),
    [trips, mode, settings],
  )

  // 잠금: 전체 기록이 기준 미만이면 안내만.
  if (trips.length < UNLOCK_AT) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="text-lg font-bold text-white">기록 {UNLOCK_AT}건부터 작전판이 열립니다</h1>
        <p className="text-sm text-neutral-500">
          지금 {trips.length}건 · {UNLOCK_AT - trips.length}건 더 기록하면 열려요.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-24">
      {/* 모드 전환 */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-300">모드</span>
          <span className="text-xs text-neutral-500">
            자동: {MODE_LABEL[auto]}
            {override && ' · 수동 전환됨'}
          </span>
        </div>
        <div className="flex gap-2">
          {(['gangseo', 'dongrae'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setOverride(m === auto && override === null ? null : m)}
              className={`flex-1 rounded-lg py-2 text-sm ${
                m === mode ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-300">
        시간대별 회전·시간당 실수령
        <span className="ml-1 text-xs font-normal text-neutral-500">
          ({grid.resolution === 'coarse' ? '기본 해상도' : '고해상도'})
        </span>
      </h2>

      {grid.resolution === 'coarse' ? (
        <CoarseTable grid={grid} />
      ) : (
        <FineTable grid={grid} />
      )}

      <p className="mt-3 text-xs text-neutral-600">
        칸: 위=시간당 실수령(원/시), 가운데=평균 회전(분), 아래=건수. 표본 {MIN_SAMPLE}건 미만은
        회색.
      </p>
    </div>
  )
}

// 한 칸 내용. 표본이 적으면 회색 + 건수만.
function Cell({ stat }: { stat: CellStat }) {
  if (stat.count === 0) {
    return <div className="rounded-md bg-neutral-900 py-3 text-center text-xs text-neutral-700">–</div>
  }
  if (stat.count < MIN_SAMPLE || stat.hourlyNet === null) {
    return (
      <div className="rounded-md bg-neutral-900 py-3 text-center text-xs text-neutral-500">
        {stat.count}건
      </div>
    )
  }
  return (
    <div className="rounded-md bg-neutral-800/70 py-2 text-center">
      <div className="text-sm font-bold text-emerald-400 tabular-nums">
        {stat.hourlyNet.toLocaleString()}
      </div>
      <div className="text-xs text-neutral-400 tabular-nums">회전 {stat.avgGapMin}분</div>
      <div className="text-[11px] text-neutral-600 tabular-nums">{stat.count}건</div>
    </div>
  )
}

// coarse: 행=시간대, 열=주중/주말.
function CoarseTable({ grid }: { grid: CoarseGrid }) {
  return (
    <table className="w-full border-separate border-spacing-1" aria-label="시간대별 주중·주말 집계">
      <thead>
        <tr className="text-xs text-neutral-500">
          <th className="w-24 text-left font-normal">시간대</th>
          <th className="font-normal">주중</th>
          <th className="font-normal">주말</th>
        </tr>
      </thead>
      <tbody>
        {grid.buckets.map((b) => (
          <tr key={b}>
            <th className="text-left text-xs font-medium text-neutral-300">{BUCKET_LABEL[b]}</th>
            <td>
              <Cell stat={grid.cells[b].weekday} />
            </td>
            <td>
              <Cell stat={grid.cells[b].weekend} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// fine: 행=요일, 열=시(1시간). 열이 많아 가로 스크롤.
function FineTable({ grid }: { grid: FineGrid }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1" aria-label="요일×시간 집계">
        <thead>
          <tr className="text-xs text-neutral-500">
            <th className="sticky left-0 z-10 bg-neutral-950 font-normal">요일\시</th>
            {grid.hours.map((h) => (
              <th key={h} className="min-w-16 font-normal tabular-nums">
                {h}시
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.weekdays.map((wd) => (
            <tr key={wd}>
              <th className="sticky left-0 z-10 bg-neutral-950 text-xs font-medium text-neutral-300">
                {WEEKDAY_LABEL[wd]}
              </th>
              {grid.hours.map((h) => (
                <td key={h} className="min-w-16">
                  <Cell stat={grid.cells[`${h}|${wd}`] ?? { count: 0, avgGapMin: null, hourlyNet: null }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
