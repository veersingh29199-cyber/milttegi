import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  CarFront,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  Route,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { districtName } from '../../data/regions'
import { useSettings } from '../../hooks/useSettings'
import { useTeamOperation } from '../../hooks/useTeamOperation'
import { useTrips } from '../../hooks/useTrips'
import { analyzeBoard } from '../../lib/boardAnalysis'
import { tripNet } from '../../lib/calc'
import {
  CALLER_STATUS_LABEL,
  FOLLOWER_STATUS_LABEL,
  emptyOperation,
  isActiveOperation,
} from '../../lib/operation'
import { nowLocalISO } from '../../lib/time'
import { getTeamRole, saveTeamRole } from '../../storage/team'
import type { TeamRole } from '../../types/models'

const money = (value: number) => `${Math.round(value).toLocaleString()}원`

function Metric({ label, value, note, tone = 'default' }: { label: string; value: string; note: string; tone?: 'default' | 'good' | 'warn' }) {
  const color = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-white'
  return (
    <div className="min-w-0 border-l border-neutral-800 pl-3 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 truncate text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-neutral-600">{note}</p>
    </div>
  )
}

function RoleSwitch({ role, onChange }: { role: TeamRole; onChange: (role: TeamRole) => void }) {
  return (
    <div className="flex rounded-md bg-neutral-900 p-1" aria-label="이 기기 역할">
      {([['caller', '콜수행'], ['follower', '뒷차']] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={role === value}
          className={`min-h-8 rounded px-3 text-xs font-semibold transition-colors ${
            role === value ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function EmptyAnalysis() {
  return (
    <div className="border border-dashed border-neutral-800 px-4 py-8 text-center">
      <BarChart3 className="mx-auto h-6 w-6 text-neutral-600" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-neutral-300">분석할 운행 기록이 없습니다</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">기록 탭에서 출발지, 도착지, 요금을 입력하면<br />수익과 회전 흐름이 자동으로 채워집니다.</p>
    </div>
  )
}

export function BoardScreen() {
  const settings = useSettings()
  const { trips } = useTrips()
  const { operation, updateOperation, syncError, isShared } = useTeamOperation()
  const [role, setRole] = useState<TeamRole>(getTeamRole)
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [fare, setFare] = useState('')
  const [platformId, setPlatformId] = useState(() => settings.platforms[0]?.id ?? '')
  const [notice, setNotice] = useState('')
  const analysis = useMemo(() => analyzeBoard(trips, settings, nowLocalISO()), [settings, trips])
  const active = isActiveOperation(operation)
  const activePlatform = settings.platforms.find((platform) => platform.id === operation.platformId)
  const selectedPlatform = settings.platforms.find((platform) => platform.id === platformId)
  const estimatedNet = fare ? tripNet(Number(fare), platformId, settings) : 0

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const changeRole = (nextRole: TeamRole) => {
    saveTeamRole(nextRole)
    setRole(nextRole)
  }

  const startOperation = () => {
    if (!fromText.trim() || !toText.trim()) {
      flash('출발지와 도착지를 입력하세요')
      return
    }
    updateOperation({
      stage: 'pickup',
      callerStatus: 'pickup',
      followerStatus: 'following',
      fromText: fromText.trim(),
      toText: toText.trim(),
      fare: Math.max(0, Number(fare) || 0),
      platformId,
      startedAt: new Date().toISOString(),
    })
    setFromText('')
    setToText('')
    setFare('')
  }

  const maxBandNet = Math.max(...analysis.timeBands.map((band) => band.net), 1)
  const roleStatus = role === 'caller' ? operation.callerStatus : operation.followerStatus
  const roleStatusLabel = role === 'caller' ? CALLER_STATUS_LABEL[operation.callerStatus] : FOLLOWER_STATUS_LABEL[operation.followerStatus]

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
      <header className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isShared ? 'bg-emerald-400' : 'bg-amber-400'}`} aria-hidden="true" />
            <p className="text-xs font-semibold text-neutral-400">{isShared ? '팀 실시간 연결' : '내 기기에 저장 중'}</p>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">오늘의 작전판</h1>
          <p className="mt-1 text-sm text-neutral-500">기록을 읽고, 다음 움직임을 결정합니다</p>
        </div>
        <RoleSwitch role={role} onChange={changeRole} />
      </header>

      {(syncError || !isShared) && (
        <div className={`mt-3 flex items-start gap-2 border-l-2 px-3 py-2 text-xs leading-5 ${syncError ? 'border-red-500 bg-red-950/20 text-red-200' : 'border-amber-500 bg-amber-950/20 text-amber-200'}`}>
          <Radio className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{syncError || '같은 팀 코드를 연결하면 두 기기에서 현재 작전을 함께 볼 수 있습니다.'}</span>
        </div>
      )}

      <section className="mt-5" aria-labelledby="today-summary">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400">TODAY</p>
            <h2 id="today-summary" className="mt-1 text-sm font-semibold text-neutral-300">현재 판단</h2>
          </div>
          <span className="text-xs text-neutral-600">{analysis.todayTrips.length}건 기준</span>
        </div>
        <div className="mt-3 grid grid-cols-3 border-y border-neutral-800 py-4">
          <Metric label="실수령" value={money(analysis.todayNet)} note={`목표 ${analysis.targetProgress}%`} tone="good" />
          <Metric label="시간당" value={analysis.hourlyNet === null ? '—' : money(analysis.hourlyNet)} note={`기준 ${money(settings.minHourly)}`} tone={analysis.hourlyNet !== null && analysis.hourlyNet < settings.minHourly ? 'warn' : 'default'} />
          <Metric label="평균 회전" value={analysis.averageTurnMin === null ? '—' : `${analysis.averageTurnMin}분`} note="연속 운행 간격" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${analysis.targetProgress}%` }} />
          </div>
          <p className="shrink-0 text-xs tabular-nums text-neutral-400">
            {analysis.targetLeft === 0 ? '목표 달성' : `목표까지 ${money(analysis.targetLeft)}`}
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <section aria-labelledby="current-operation">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h2 id="current-operation" className="text-sm font-bold text-white">현재 콜</h2>
            </div>
            <span className={`rounded px-2 py-1 text-[11px] font-semibold ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-900 text-neutral-500'}`}>
              {active ? roleStatusLabel : '대기 중'}
            </span>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/45 p-4">
            {active ? (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                    <CarFront className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-base font-bold text-white">
                      <span className="truncate">{operation.fromText}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-neutral-600" aria-hidden="true" />
                      <span className="truncate">{operation.toText}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{activePlatform?.name ?? '플랫폼 미입력'} · {operation.fare ? money(operation.fare) : '요금 미입력'}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-px bg-neutral-800">
                  <div className="bg-[#0d1218] px-3 py-3">
                    <p className="text-[11px] text-neutral-600">콜수행</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-200">{CALLER_STATUS_LABEL[operation.callerStatus]}</p>
                  </div>
                  <div className="bg-[#0d1218] px-3 py-3">
                    <p className="text-[11px] text-neutral-600">뒷차</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-200">{FOLLOWER_STATUS_LABEL[operation.followerStatus]}</p>
                  </div>
                </div>

                {role === 'caller' ? (
                  <button
                    type="button"
                    onClick={() => operation.stage === 'pickup' ? updateOperation({ stage: 'driving', callerStatus: 'driving' }) : updateOperation(emptyOperation())}
                    className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white active:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {operation.stage === 'pickup' ? '픽업 완료 · 운행 시작' : '작전 종료'}
                  </button>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {([['following', '동행 중'], ['waiting', '대기 위치']] as const).map(([status, label]) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateOperation({ followerStatus: status })}
                        aria-pressed={roleStatus === status}
                        className={`min-h-12 rounded-md text-sm font-semibold ${roleStatus === status ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : role === 'caller' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[11px] font-medium text-neutral-500">출발지</span>
                    <input value={fromText} onChange={(event) => setFromText(event.target.value)} placeholder="현재 위치" className="min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-700" />
                  </label>
                  <ArrowRight className="mt-5 h-4 w-4 text-neutral-700" aria-hidden="true" />
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[11px] font-medium text-neutral-500">도착지</span>
                    <input value={toText} onChange={(event) => setToText(event.target.value)} placeholder="목적지" className="min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-700" />
                  </label>
                </div>
                <div className="grid grid-cols-[1fr_7.5rem] gap-2">
                  <label>
                    <span className="mb-1.5 block text-[11px] font-medium text-neutral-500">요금</span>
                    <input value={fare} onChange={(event) => setFare(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0원" className="min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-700" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[11px] font-medium text-neutral-500">플랫폼</span>
                    <select value={platformId} onChange={(event) => setPlatformId(event.target.value)} className="min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white">
                      {settings.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
                    </select>
                  </label>
                </div>
                {fare && (
                  <div className="flex items-center justify-between border-y border-neutral-800 py-2 text-xs">
                    <span className="text-neutral-500">예상 실수령 · {selectedPlatform?.name}</span>
                    <strong className="text-emerald-300">{money(estimatedNet)}</strong>
                  </div>
                )}
                <button type="button" onClick={startOperation} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white active:bg-emerald-700">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  작전 시작
                </button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Users className="mx-auto h-6 w-6 text-neutral-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-neutral-300">콜수행자의 입력을 기다리는 중</p>
                <p className="mt-1 text-xs text-neutral-600">작전이 시작되면 경로와 상태가 바로 표시됩니다.</p>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="decision-guide">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <h2 id="decision-guide" className="text-sm font-bold text-white">판단 가이드</h2>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/45 p-4">
            <p className="text-sm font-semibold leading-6 text-neutral-100">{analysis.insight}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-neutral-950 px-3 py-3">
                <div className="flex items-center gap-1.5 text-neutral-500"><Target className="h-3.5 w-3.5" /><span className="text-[11px]">목표 예상</span></div>
                <p className="mt-1 text-sm font-bold text-white">{analysis.targetLeft === 0 ? '달성 완료' : analysis.callsLeft ? `평균 ${analysis.callsLeft}건 남음` : '기록 필요'}</p>
              </div>
              <div className="bg-neutral-950 px-3 py-3">
                <div className="flex items-center gap-1.5 text-neutral-500">{analysis.recentTrend !== null && analysis.recentTrend < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}<span className="text-[11px]">최근 흐름</span></div>
                <p className={`mt-1 text-sm font-bold ${analysis.recentTrend !== null && analysis.recentTrend < 0 ? 'text-amber-300' : 'text-white'}`}>{analysis.recentTrend === null ? '6건부터 비교' : `${analysis.recentTrend >= 0 ? '+' : ''}${analysis.recentTrend}%`}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-7" aria-labelledby="performance-analysis">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <h2 id="performance-analysis" className="text-sm font-bold text-white">수익 분석</h2>
          </div>
          <span className="text-[11px] text-neutral-600">최근 최대 100건 · 입력 기록 기준</span>
        </div>

        {analysis.sampleSize === 0 ? <div className="mt-3"><EmptyAnalysis /></div> : (
          <div className="mt-3 grid gap-px bg-neutral-800 sm:grid-cols-3">
            <div className="bg-[#0b0f14] p-4">
              <div className="flex items-center gap-2 text-neutral-500"><Route className="h-4 w-4" /><span className="text-xs">건당 수익 상위 경로</span></div>
              <p className="mt-3 truncate text-sm font-bold text-white">{analysis.topRoute ? analysis.topRoute.label.split(' → ').map(districtName).join(' → ') : '—'}</p>
              <p className="mt-1 text-xs text-neutral-500">평균 {analysis.topRoute ? money(analysis.topRoute.average) : '—'} · {analysis.topRoute?.count ?? 0}건</p>
            </div>
            <div className="bg-[#0b0f14] p-4">
              <div className="flex items-center gap-2 text-neutral-500"><MapPin className="h-4 w-4" /><span className="text-xs">도착지 효율</span></div>
              <p className="mt-3 truncate text-sm font-bold text-white">{analysis.topDestination ? districtName(analysis.topDestination.label) : '—'}</p>
              <p className="mt-1 text-xs text-neutral-500">건당 평균 {analysis.topDestination ? money(analysis.topDestination.average) : '—'}</p>
            </div>
            <div className="bg-[#0b0f14] p-4">
              <div className="flex items-center gap-2 text-neutral-500"><CircleDollarSign className="h-4 w-4" /><span className="text-xs">플랫폼 효율</span></div>
              <p className="mt-3 truncate text-sm font-bold text-white">{analysis.bestPlatform?.label ?? '—'}</p>
              <p className="mt-1 text-xs text-neutral-500">건당 평균 {analysis.bestPlatform ? money(analysis.bestPlatform.average) : '—'}</p>
            </div>
          </div>
        )}
      </section>

      {analysis.timeBands.length > 0 && (
        <section className="mt-7" aria-labelledby="time-analysis">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-violet-300" aria-hidden="true" />
            <h2 id="time-analysis" className="text-sm font-bold text-white">오늘 시간대 흐름</h2>
          </div>
          <div className="mt-4 space-y-3">
            {analysis.timeBands.map((band) => (
              <div key={band.key} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3 text-xs">
                <span className="text-neutral-400">{band.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-900"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(8, (band.net / maxBandNet) * 100)}%` }} /></div>
                <span className="text-right tabular-nums text-neutral-300">{money(band.net)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis.todayTrips.length > 0 && (
        <section className="mt-7" aria-labelledby="recent-trips">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-trips" className="text-sm font-bold text-white">최근 운행</h2>
            <span className="text-[11px] text-neutral-600">오늘 기록</span>
          </div>
          <div className="divide-y divide-neutral-800 border-y border-neutral-800">
            {analysis.todayTrips.slice(-3).reverse().map((trip) => (
              <div key={trip.id} className="flex min-h-14 items-center gap-3 py-2.5">
                <span className="w-11 shrink-0 text-xs tabular-nums text-neutral-600">{trip.at.slice(11, 16)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-200">{districtName(trip.from)} <ChevronRight className="inline h-3.5 w-3.5 text-neutral-700" /> {districtName(trip.to)}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-600">{settings.platforms.find((platform) => platform.id === trip.platformId)?.name ?? trip.platformId}</p>
                </div>
                <strong className="shrink-0 text-sm tabular-nums text-emerald-300">{money(tripNet(trip.fare, trip.platformId, settings))}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {notice && <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center"><span className="rounded-full bg-neutral-700 px-4 py-2 text-sm text-white shadow-xl">{notice}</span></div>}
    </main>
  )
}
