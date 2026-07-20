import type { Settings, Trip } from '../../types/models'
import { businessDay, tripNet } from '../../lib/calc'
import { nowLocalISO } from '../../lib/time'

// 오늘(영업일) 실수령 합 vs 하루 목표액 진행바.
// 기준 = 실수령 합(모드 무관, 경비 미반영).
export function DailyTargetBar({ trips, settings }: { trips: Trip[]; settings: Settings }) {
  const target = settings.dailyTarget
  if (!target || target <= 0) return null // 목표 미설정이면 표시 안 함

  const today = businessDay(nowLocalISO())
  const todayNet = trips
    .filter((t) => businessDay(t.at) === today)
    .reduce((s, t) => s + tripNet(t.fare, t.platformId, settings), 0)

  const ratio = Math.min(1, todayNet / target)
  const pct = Math.round((todayNet / target) * 100)
  const remaining = Math.max(0, target - todayNet)
  const done = todayNet >= target

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-neutral-300">
          오늘 목표 <span className="text-neutral-500">{target.toLocaleString()}원</span>
        </span>
        <span className={`text-sm font-bold tabular-nums ${done ? 'text-emerald-400' : 'text-white'}`}>
          {pct}%
        </span>
      </div>
      {/* 진행바 */}
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-emerald-600'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between text-xs">
        <span className="tabular-nums text-emerald-400">실수령 {todayNet.toLocaleString()}원</span>
        <span className="tabular-nums text-neutral-500">
          {done ? '목표 달성 🎉' : `${remaining.toLocaleString()}원 남음`}
        </span>
      </div>
    </section>
  )
}
