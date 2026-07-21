import type { Platform } from '../../types/models'

// 플랫폼 선택 칩(카카오/티맵 등). 마지막 선택을 기억하는 로직은
// 상위(RecordScreen)에서 최근 기록 기반으로 초기값을 정한다.
export function PlatformChips({
  platforms,
  value,
  onChange,
}: {
  platforms: Platform[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-neutral-200">플랫폼</span>
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => {
          const on = p.id === value
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={`min-h-10 rounded-lg border px-4 text-sm font-semibold ${
                on
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-200 active:bg-neutral-700'
              }`}
            >
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
