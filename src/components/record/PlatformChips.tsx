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
      <span className="mb-1.5 block text-sm font-medium text-neutral-300">플랫폼</span>
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => {
          const on = p.id === value
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                on
                  ? 'bg-emerald-600 text-white'
                  : 'border border-neutral-700 bg-neutral-800 text-neutral-200'
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
