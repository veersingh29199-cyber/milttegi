import type { PlatformStat, DestStat, WeeklySummary } from '../../lib/board'

// 작전판 위젯 모음(②플랫폼 ③도착지 ④주간 요약).

// 섹션 공통 껍데기.
function Widget({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">
        {title}
        {hint && <span className="ml-1 text-xs font-normal text-neutral-500">{hint}</span>}
      </h2>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="rounded-lg bg-neutral-900 py-4 text-center text-sm text-neutral-600">데이터 부족</p>
}

// ② 플랫폼 비교
export function PlatformWidget({ stats }: { stats: PlatformStat[] }) {
  const active = stats.filter((s) => s.count > 0)
  return (
    <Widget title="플랫폼 비교" hint="(현재 모드)">
      {active.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full text-sm" aria-label="플랫폼별 비교">
          <thead>
            <tr className="text-xs text-neutral-500">
              <th className="py-1 text-left font-normal">플랫폼</th>
              <th className="py-1 text-right font-normal">건수</th>
              <th className="py-1 text-right font-normal">평균요금</th>
              <th className="py-1 text-right font-normal">실수령합</th>
            </tr>
          </thead>
          <tbody>
            {active.map((s) => (
              <tr key={s.id} className="border-t border-neutral-800">
                <td className="py-2 text-neutral-200">{s.name}</td>
                <td className="py-2 text-right tabular-nums text-neutral-300">{s.count}</td>
                <td className="py-2 text-right tabular-nums text-neutral-300">
                  {s.avgFare.toLocaleString()}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-emerald-400">
                  {s.netSum.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Widget>
  )
}

// ③ 도착지 랭킹(회전 빠른 곳/느린 곳 + 막콜 비율)
export function DestinationWidget({ stats }: { stats: DestStat[] }) {
  // 회전 데이터가 있는 도착지를 회전 빠른 순으로.
  const rankable = stats.filter((d) => d.avgGapMin !== null).sort((a, b) => a.avgGapMin! - b.avgGapMin!)

  return (
    <Widget title="도착지 랭킹" hint="(현재 모드 · 회전 빠른 순)">
      {rankable.length === 0 ? (
        <Empty />
      ) : (
        <ul className="flex flex-col gap-1.5" aria-label="도착지 랭킹">
          {rankable.map((d, i) => {
            const fast = i === 0
            const slow = i === rankable.length - 1 && rankable.length > 1
            const highLastCall = d.lastCallRate >= 0.5
            return (
              <li
                key={d.code}
                className="flex items-center justify-between rounded-lg bg-neutral-900 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-200">{d.name}</span>
                  {fast && <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[11px] text-emerald-300">연결 좋음</span>}
                  {slow && <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-[11px] text-amber-300">느림</span>}
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-neutral-400">회전 {d.avgGapMin}분</span>
                  <span className={highLastCall ? 'text-red-400' : 'text-neutral-600'}>
                    막콜 {Math.round(d.lastCallRate * 100)}%
                  </span>
                  <span className="text-neutral-600">{d.count}건</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Widget>
  )
}

// ④ 주간 요약
export function WeeklyWidget({ summary }: { summary: WeeklySummary }) {
  const met = summary.vsMinHourly !== null && summary.vsMinHourly >= 0
  return (
    <Widget title="주간 요약" hint={`(${summary.fromDay} ~ ${summary.toDay})`}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="실수령 합" value={`${summary.netSum.toLocaleString()}원`} />
        <Stat label="경비" value={`${summary.expenseSum.toLocaleString()}원`} />
        <Stat
          label="순수익 (경비 차감)"
          value={`${summary.profit.toLocaleString()}원`}
          accent
        />
        <Stat
          label="시간당 실수령"
          value={summary.hourlyNet === null ? '—' : `${summary.hourlyNet.toLocaleString()}원`}
          sub={
            summary.hourlyNet === null
              ? '근무시간 부족'
              : `최소 ${summary.minHourly.toLocaleString()} 대비 ${met ? '+' : ''}${summary.vsMinHourly!.toLocaleString()}`
          }
          tone={summary.hourlyNet === null ? 'muted' : met ? 'good' : 'bad'}
        />
      </div>
      <p className="mt-1.5 text-xs text-neutral-600">
        {summary.tripCount}건
        {summary.workedHours !== null && ` · 근무 ${summary.workedHours.toFixed(1)}시간`}
      </p>
    </Widget>
  )
}

function Stat({
  label,
  value,
  sub,
  accent,
  tone,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  tone?: 'good' | 'bad' | 'muted'
}) {
  const valueColor =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'bad'
        ? 'text-red-400'
        : tone === 'muted'
          ? 'text-neutral-500'
          : accent
            ? 'text-emerald-400'
            : 'text-white'
  return (
    <div className="rounded-lg bg-neutral-900 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div>}
    </div>
  )
}
