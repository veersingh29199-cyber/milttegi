// 켬/끔 토글 하나. 비 여부·행사일 여부에 쓴다.
export function Toggle({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
        on
          ? 'bg-emerald-600 text-white'
          : 'border border-neutral-700 bg-neutral-800 text-neutral-400'
      }`}
    >
      {label} {on ? 'ON' : 'OFF'}
    </button>
  )
}
