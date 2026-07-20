// 요금 전용 숫자패드.
// OS 키보드를 띄우지 않고 큰 버튼으로 빠르게 입력한다(+5천/+1만 포함).
export function FareInput({
  value,
  onChange,
  subtitle,
}: {
  value: number
  onChange: (fare: number) => void
  subtitle?: string
}) {
  // 숫자 하나를 뒤에 붙인다(요금은 최대 6자리로 제한 = 999,999원).
  const pushDigit = (d: number) => {
    const next = value * 10 + d
    if (next > 999999) return
    onChange(next)
  }
  // 뒤에 '00'을 붙인다(천 단위 빠른 입력). 넘치면 무시.
  const pushDoubleZero = () => {
    const next = value * 100
    if (next > 999999) return
    onChange(next)
  }
  // 맨 뒷자리 하나 지우기.
  const backspace = () => onChange(Math.floor(value / 10))
  // 빠른 가산(넘치면 무시).
  const add = (amount: number) => {
    const next = value + amount
    onChange(next > 999999 ? value : next)
  }

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-300">
          요금{subtitle && <span className="ml-1 text-xs text-neutral-500">{subtitle}</span>}
        </span>
        <span className="text-2xl font-bold text-white tabular-nums">
          {value.toLocaleString()}
          <span className="ml-1 text-base font-normal text-neutral-400">원</span>
        </span>
      </div>

      {/* 빠른 가산 버튼 */}
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => add(5000)}
          className="flex-1 rounded-lg bg-neutral-800 py-2 text-sm font-semibold text-emerald-300"
        >
          +5천
        </button>
        <button
          type="button"
          onClick={() => add(10000)}
          className="flex-1 rounded-lg bg-neutral-800 py-2 text-sm font-semibold text-emerald-300"
        >
          +1만
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className="flex-1 rounded-lg bg-neutral-800 py-2 text-sm text-neutral-400"
        >
          초기화
        </button>
      </div>

      {/* 숫자패드 */}
      <div className="grid grid-cols-3 gap-2">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => pushDigit(d)}
            className="rounded-lg bg-neutral-800 py-3 text-lg font-semibold text-white tabular-nums"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => pushDigit(0)}
          className="rounded-lg bg-neutral-800 py-3 text-lg font-semibold text-white tabular-nums"
        >
          0
        </button>
        <button
          type="button"
          onClick={pushDoubleZero}
          className="rounded-lg bg-neutral-800 py-3 text-lg font-semibold text-white tabular-nums"
        >
          00
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="한 자리 지우기"
          className="rounded-lg bg-neutral-800 py-3 text-lg font-semibold text-neutral-300"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
