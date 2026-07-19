import type {
  GangseoVsDongrae,
  AvoidancePremium,
  ZoneExitBreakeven,
  CohortStat,
} from '../../lib/board'
import { REPORT_MIN } from '../../lib/board'

// 전용 리포트 3종(4-C). 데이터가 충족될 때만 활성화된다.

function ReportCard({
  title,
  ready,
  children,
}: {
  title: string
  ready: boolean
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
      <h3 className="mb-2 text-sm font-semibold text-neutral-200">{title}</h3>
      {ready ? (
        children
      ) : (
        <p className="py-2 text-center text-xs text-neutral-600">
          데이터 부족 (각 {REPORT_MIN}건 이상 쌓이면 열려요)
        </p>
      )}
    </section>
  )
}

// 두 값 비교 막대. 큰 쪽을 강조한다.
function CompareRow({
  label,
  value,
  best,
  unit = '원',
}: {
  label: string
  value: number | null
  best: boolean
  unit?: string
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <span
        className={`text-sm font-bold tabular-nums ${best ? 'text-emerald-400' : 'text-neutral-400'}`}
      >
        {value === null ? '—' : value.toLocaleString()}
        <span className="ml-0.5 text-xs font-normal text-neutral-500">{unit}</span>
      </span>
    </div>
  )
}

// 시간당 실수령 기준으로 더 나은 코호트를 판단(null은 진다).
function betterHourly(a: CohortStat, b: CohortStat): 'a' | 'b' | null {
  if (a.hourlyNet === null && b.hourlyNet === null) return null
  if (a.hourlyNet === null) return 'b'
  if (b.hourlyNet === null) return 'a'
  return a.hourlyNet >= b.hourlyNet ? 'a' : 'b'
}

export function Reports({
  aReport,
  bReport,
  cReport,
}: {
  aReport: GangseoVsDongrae
  bReport: AvoidancePremium
  cReport: ZoneExitBreakeven
}) {
  const aWin = betterHourly(aReport.weekdayGangseo, aReport.weekendDongrae)
  const cWin = betterHourly(cReport.inside, cReport.exit)
  const premium = bReport.outer.avgFare - bReport.center.avgFare

  return (
    <div className="mt-6">
      <h2 className="mb-1 text-sm font-semibold text-neutral-300">전용 리포트</h2>

      {/* ⓐ 평일 강서 vs 주말 동래 */}
      <ReportCard title="ⓐ 평일 강서 vs 주말 동래 (시간당 실수령)" ready={aReport.ready}>
        <CompareRow
          label={`평일 강서 (${aReport.weekdayGangseo.count}건)`}
          value={aReport.weekdayGangseo.hourlyNet}
          best={aWin === 'a'}
          unit="원/시"
        />
        <CompareRow
          label={`주말 동래 (${aReport.weekendDongrae.count}건)`}
          value={aReport.weekendDongrae.hourlyNet}
          best={aWin === 'b'}
          unit="원/시"
        />
        <p className="mt-1 text-xs text-neutral-500">
          {aWin === 'a' ? '평일 강서' : aWin === 'b' ? '주말 동래' : '—'}가 시간당 실수령이 더 높아요.
        </p>
      </ReportCard>

      {/* ⓑ 기피 프리미엄 */}
      <ReportCard title="ⓑ 기피 프리미엄 (내 구역 중심 vs 외곽)" ready={bReport.ready}>
        <div className="grid grid-cols-3 gap-1 text-xs">
          <span className="text-neutral-500" />
          <span className="text-center text-neutral-400">평균 단가</span>
          <span className="text-center text-neutral-400">평균 회전</span>

          <span className="text-neutral-300">중심 ({bReport.center.count}건)</span>
          <span className="text-center tabular-nums text-neutral-300">
            {bReport.center.avgFare.toLocaleString()}
          </span>
          <span className="text-center tabular-nums text-neutral-300">
            {bReport.center.avgGapMin === null ? '—' : `${bReport.center.avgGapMin}분`}
          </span>

          <span className="text-neutral-300">외곽 ({bReport.outer.count}건)</span>
          <span className="text-center font-semibold tabular-nums text-emerald-400">
            {bReport.outer.avgFare.toLocaleString()}
          </span>
          <span className="text-center tabular-nums text-neutral-300">
            {bReport.outer.avgGapMin === null ? '—' : `${bReport.outer.avgGapMin}분`}
          </span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          외곽이 단가 {premium >= 0 ? '+' : ''}
          {premium.toLocaleString()}원. 회전(복귀 부담)과 견줘 판단하세요.
        </p>
      </ReportCard>

      {/* ⓒ 구역 이탈 손익분기 */}
      <ReportCard title="ⓒ 구역 이탈 손익분기 (강서 기준)" ready={cReport.ready}>
        <CompareRow
          label={`구역 내 회전 강서→강서 (${cReport.inside.count}건)`}
          value={cReport.inside.hourlyNet}
          best={cWin === 'a'}
          unit="원/시"
        />
        <CompareRow
          label={`구역 이탈 강서→밖 (${cReport.exit.count}건)`}
          value={cReport.exit.hourlyNet}
          best={cWin === 'b'}
          unit="원/시"
        />
        <p className="mt-1 text-xs text-neutral-500">
          이탈 콜은 복귀 시간까지 반영된 실질 시급이에요.{' '}
          {cWin === 'b'
            ? '이탈이 더 이득.'
            : cWin === 'a'
              ? '구역 내 회전이 더 이득.'
              : '—'}
        </p>
      </ReportCard>
    </div>
  )
}
