import { useState } from 'react'
import { formatMdHm, toDatetimeLocalValue, fromDatetimeLocalValue } from '../../lib/time'

// 운행 종료 시각. 기본은 현재 시각(자동)이고, 탭하면 폰 기본 시간 선택기로 수정한다.
export function TimeField({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-neutral-300">종료 시각</span>
      {editing ? (
        <input
          type="datetime-local"
          autoFocus
          value={toDatetimeLocalValue(value)}
          onChange={(e) => onChange(fromDatetimeLocalValue(e.target.value))}
          onBlur={() => setEditing(false)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-white"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-white tabular-nums"
        >
          {formatMdHm(value)} ✎
        </button>
      )}
    </div>
  )
}
