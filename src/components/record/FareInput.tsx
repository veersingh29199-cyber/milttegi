// 요금 전용 숫자패드.
// OS 키보드를 띄우지 않고 큰 버튼으로 빠르게 입력한다(+5천/+1만 포함).
export function FareInput({
  value,
  onChange,
  subtitle,
  quickValues = [10000, 15000, 20000, 25000],
}: {
  value: number
  onChange: (fare: number) => void
  subtitle?: string
  quickValues?: number[]
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
      <div className="mb-3 flex items-end justify-between">
        <span className="text-sm font-semibold text-neutral-200">
          요금{subtitle && <span className="ml-1 text-xs text-neutral-500">{subtitle}</span>}
        </span>
        <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
          {value.toLocaleString()}
          <span className="ml-1 text-base font-medium text-neutral-400">원</span>
        </span>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        {quickValues.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(amount)}
            className={`min-h-11 rounded-lg border text-sm font-bold tabular-nums transition-colors ${
              value === amount
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-neutral-700 bg-neutral-800 text-emerald-300 active:bg-neutral-700'
            }`}
          >
            {amount >= 10000 ? `${amount / 10000}만` : `${amount / 1000}천`}
          </button>
        ))}
      </div>

      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => add(5000)}
          className="min-h-10 flex-1 rounded-lg bg-neutral-800 text-sm font-semibold text-emerald-300 active:bg-neutral-700"
        >
          +5천
        </button>
        <button
          type="button"
          onClick={() => add(10000)}
          className="min-h-10 flex-1 rounded-lg bg-neutral-800 text-sm font-semibold text-emerald-300 active:bg-neutral-700"
        >
          +1만
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className="min-h-10 flex-1 rounded-lg bg-neutral-800 text-sm font-medium text-neutral-400 active:bg-neutral-700"
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
            className="min-h-13 rounded-lg bg-neutral-800 text-lg font-semibold text-white tabular-nums active:bg-neutral-700"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => pushDigit(0)}
          className="min-h-13 rounded-lg bg-neutral-800 text-lg font-semibold text-white tabular-nums active:bg-neutral-700"
        >
          0
        </button>
        <button
          type="button"
          onClick={pushDoubleZero}
          className="min-h-13 rounded-lg bg-neutral-800 text-lg font-semibold text-white tabular-nums active:bg-neutral-700"
        >
          00
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="한 자리 지우기"
          className="min-h-13 rounded-lg bg-neutral-800 text-lg font-semibold text-neutral-300 active:bg-neutral-700"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
