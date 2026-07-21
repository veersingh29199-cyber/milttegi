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

  const quickPicks = [
    ...settings.customZones.map((zone) => ({
      key: `zone-${zone.id}`,
      label: zone.name,
      code: zone.parentCode,
      zoneId: zone.id,
      active: zoneValue === zone.id,
    })),
    ...settings.favorites
      .filter((code) => !settings.customZones.some((zone) => zone.parentCode === code))
      .map((code) => ({
        key: `favorite-${code}`,
        label: districtName(code),
        code,
        zoneId: undefined,
        active: value === code && !zoneValue,
      })),
  ].slice(0, 5)

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-200">{label}</span>
        {value && <span className="text-xs font-medium text-emerald-400">선택됨</span>}
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`flex min-h-13 w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
          value
            ? 'border-emerald-700/80 bg-emerald-950/35 text-white'
            : 'border-neutral-700 bg-neutral-900 text-neutral-400'
        }`}
      >
        <span className="text-base font-semibold">{value ? selectedLabel : `${label} 선택`}</span>
        <span className="text-lg text-neutral-400" aria-hidden="true">›</span>
      </button>

      <div className="mt-2 flex flex-wrap gap-2">
        {quickPicks.map((pick) => (
          <button
            key={pick.key}
            type="button"
            onClick={() => onPick(pick.code, pick.zoneId)}
            className={`min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors ${
              pick.active
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-neutral-700 bg-neutral-800 text-neutral-200 active:bg-neutral-700'
            }`}
          >
            {pick.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="min-h-10 rounded-lg border border-neutral-700 px-3 text-sm font-medium text-neutral-300 active:bg-neutral-800"
        >
          전체 지역
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
