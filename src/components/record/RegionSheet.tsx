import { useState } from 'react'
import { REGIONS, districtName } from '../../data/regions'

// '전체'에서 여는 지역 선택 바텀시트.
// 위: 최근 사용 지역(자동 승격) → 아래: 시·도 선택 → 시·군·구 격자.
// 시군구를 고르면 그 5자리 코드를 돌려주고 닫힌다.
export function RegionSheet({
  open,
  recentCodes,
  onSelect,
  onClose,
}: {
  open: boolean
  recentCodes: string[]
  onSelect: (code: string) => void
  onClose: () => void
}) {
  // 처음 펼친 시·도는 부산(발주자 주 무대).
  const [provinceCode, setProvinceCode] = useState(REGIONS.provinces[0].code)
  if (!open) return null

  const province = REGIONS.provinces.find((p) => p.code === provinceCode) ?? REGIONS.provinces[0]

  return (
    // 반투명 배경(딤). 배경을 누르면 닫힌다.
    <div
      className="fixed inset-0 z-30 flex items-end bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      {/* 시트 본체. 내부 클릭이 배경으로 전파돼 닫히지 않게 막는다. */}
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-neutral-800 bg-neutral-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="지역 선택"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">지역 선택</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-neutral-400"
          >
            닫기
          </button>
        </div>

        {recentCodes.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs text-neutral-500">최근 사용</p>
            <div className="flex flex-wrap gap-2">
              {recentCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onSelect(code)}
                  className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200"
                >
                  {districtName(code)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1단: 시·도 선택 */}
        <div className="mb-3 flex gap-2">
          {REGIONS.provinces.map((p) => {
            const on = p.code === provinceCode
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setProvinceCode(p.code)}
                className={`flex-1 rounded-lg py-2 text-sm ${
                  on ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {p.shortName}
              </button>
            )
          })}
        </div>

        {/* 2단: 시·군·구 격자 */}
        <div className="grid grid-cols-3 gap-2">
          {province.districts.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => onSelect(d.code)}
              className="rounded-lg border border-neutral-800 bg-neutral-800/60 py-2.5 text-sm text-neutral-200"
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
