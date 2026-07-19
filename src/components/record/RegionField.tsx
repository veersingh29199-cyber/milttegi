import { useState } from 'react'
import type { Settings } from '../../types/models'
import { districtName } from '../../data/regions'
import { RegionSheet } from './RegionSheet'

// 출발지/도착지 공통 입력.
// 먼저 내 구역 칩 + 즐겨찾기 칩 한 줄이 보이고, '전체'로 바텀시트를 연다.
// 내 구역을 고르면 그 상위 시군구 코드와 구역 id를 함께 넘긴다.
export function RegionField({
  label,
  value,
  zoneValue,
  settings,
  recentCodes,
  onPick,
}: {
  label: string
  value: string
  zoneValue?: string
  settings: Settings
  recentCodes: string[]
  onPick: (code: string, zoneId?: string) => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedLabel = value
    ? zoneValue
      ? settings.customZones.find((z) => z.id === zoneValue)?.name ?? districtName(value)
      : districtName(value)
    : '미선택'

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-neutral-300">{label}</span>
        <span className="text-sm text-emerald-400">{selectedLabel}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* 내 구역 칩 */}
        {settings.customZones.map((z) => {
          const on = zoneValue === z.id
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onPick(z.parentCode, z.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                on
                  ? 'bg-emerald-600 text-white'
                  : 'border border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
              }`}
            >
              {z.name}
            </button>
          )
        })}

        {/* 즐겨찾기 칩 */}
        {settings.favorites.map((code) => {
          const on = value === code && !zoneValue
          return (
            <button
              key={code}
              type="button"
              onClick={() => onPick(code)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                on
                  ? 'bg-emerald-600 text-white'
                  : 'border border-neutral-700 bg-neutral-800 text-neutral-200'
              }`}
            >
              {districtName(code)}
            </button>
          )
        })}

        {/* 전체 버튼 → 바텀시트 */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="rounded-full border border-neutral-600 px-3 py-1.5 text-sm text-neutral-300"
        >
          전체 ▾
        </button>
      </div>

      <RegionSheet
        open={sheetOpen}
        recentCodes={recentCodes}
        onSelect={(code) => {
          onPick(code)
          setSheetOpen(false)
        }}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
