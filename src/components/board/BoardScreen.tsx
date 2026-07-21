import { useMemo, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { useTeamOperation } from '../../hooks/useTeamOperation'
import { useTrips } from '../../hooks/useTrips'
import {
  CALLER_STATUS_LABEL,
  FOLLOWER_STATUS_LABEL,
  OPERATION_STAGE_LABEL,
  emptyOperation,
  isActiveOperation,
  operationRoute,
} from '../../lib/operation'
import { tripNet, businessDay } from '../../lib/calc'
import { nowLocalISO } from '../../lib/time'
import { getTeamRole, saveTeamRole } from '../../storage/team'
import type { TeamRole } from '../../types/models'

function RolePicker({ role, onChange }: { role: TeamRole; onChange: (role: TeamRole) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="이 기기 역할">
      {(
        [
          ['caller', '콜수행'],
          ['follower', '뒷차'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={role === value}
          className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${
            role === value
              ? 'border-emerald-500 bg-emerald-600 text-white'
              : 'border-neutral-700 bg-neutral-900 text-neutral-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function StatusPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-medium ${
        active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
      }`}
    >
      {label}
    </span>
  )
}

// 작전판은 사후 통계가 아니라 2인 1조가 지금 처리하는 한 건의 콜을 맞추는 화면이다.
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

  const today = businessDay(nowLocalISO())
  const review = useMemo(() => {
    const todayTrips = trips.filter((trip) => businessDay(trip.at) === today)
    const net = todayTrips.reduce((sum, trip) => sum + tripNet(trip.fare, trip.platformId, settings), 0)
    return { count: todayTrips.length, net, targetLeft: Math.max(0, settings.dailyTarget - net) }
  }, [settings, today, trips])

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

  const beginDriving = () => updateOperation({ stage: 'driving', callerStatus: 'driving' })
  const finishOperation = () => updateOperation(emptyOperation())
  const active = isActiveOperation(operation)
  const platformName = settings.platforms.find((platform) => platform.id === operation.platformId)?.name

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-5 pb-24">
      <header>
        <h1 className="text-xl font-bold text-white">현재 작전</h1>
        <p className="mt-1 text-sm text-neutral-400">한 건을 함께 보고, 각자 상태만 빠르게 맞춥니다</p>
      </header>

      <section className="border-y border-neutral-800 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">이 기기 역할</h2>
          <span className="text-xs text-neutral-500">기기별 설정</span>
        </div>
        <RolePicker role={role} onChange={changeRole} />
      </section>

      {!isShared && (
        <p className="border-l-2 border-amber-500 bg-amber-950/25 px-3 py-2 text-sm text-amber-200">
          이 기기에서만 작전을 보고 있어요. 설정에서 같은 팀 코드로 연결하면 뒷차와 즉시 공유됩니다.
        </p>
      )}
      {syncError && (
        <p className="border-l-2 border-red-500 bg-red-950/25 px-3 py-2 text-sm text-red-200">{syncError}</p>
      )}

      <section className="border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">{OPERATION_STAGE_LABEL[operation.stage]}</h2>
            <p className="mt-1 text-sm text-neutral-300">{operationRoute(operation)}</p>
          </div>
          {active && <StatusPill label={platformName ?? '플랫폼 미입력'} active />}
        </div>

        {active ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 border-y border-neutral-800 py-3">
              <div>
                <p className="text-xs text-neutral-500">콜수행</p>
                <div className="mt-1">
                  <StatusPill label={CALLER_STATUS_LABEL[operation.callerStatus]} active={operation.callerStatus !== 'ready'} />
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-500">뒷차</p>
                <div className="mt-1">
                  <StatusPill label={FOLLOWER_STATUS_LABEL[operation.followerStatus]} active={operation.followerStatus !== 'ready'} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-neutral-500">콜 요금</span>
              <strong className="tabular-nums text-white">
                {operation.fare > 0 ? `${operation.fare.toLocaleString()}원` : '미입력'}
              </strong>
            </div>

            {role === 'caller' ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {operation.stage === 'pickup' && (
                  <button
                    type="button"
                    onClick={beginDriving}
                    className="col-span-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white"
                  >
                    픽업 완료 · 운행 시작
                  </button>
                )}
                {operation.stage === 'driving' && (
                  <button
                    type="button"
                    onClick={finishOperation}
                    className="col-span-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white"
                  >
                    작전 종료
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateOperation({ followerStatus: 'following' })}
                  aria-pressed={operation.followerStatus === 'following'}
                  className={`rounded-lg py-3 text-sm font-semibold ${
                    operation.followerStatus === 'following'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  동행 중
                </button>
                <button
                  type="button"
                  onClick={() => updateOperation({ followerStatus: 'waiting' })}
                  aria-pressed={operation.followerStatus === 'waiting'}
                  className={`rounded-lg py-3 text-sm font-semibold ${
                    operation.followerStatus === 'waiting'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  대기 위치
                </button>
              </div>
            )}
          </>
        ) : role === 'caller' ? (
          <div className="mt-4 flex flex-col gap-2">
            <input
              value={fromText}
              onChange={(event) => setFromText(event.target.value)}
              placeholder="출발지"
              aria-label="현재 콜 출발지"
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white placeholder:text-neutral-600"
            />
            <input
              value={toText}
              onChange={(event) => setToText(event.target.value)}
              placeholder="도착지"
              aria-label="현재 콜 도착지"
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white placeholder:text-neutral-600"
            />
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <input
                value={fare}
                onChange={(event) => setFare(event.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="요금 (선택)"
                aria-label="현재 콜 요금"
                className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white placeholder:text-neutral-600"
              />
              <select
                value={platformId}
                onChange={(event) => setPlatformId(event.target.value)}
                aria-label="현재 콜 플랫폼"
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
              >
                {settings.platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={startOperation}
              className="mt-1 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white"
            >
              이 콜 작전 시작
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-neutral-950 px-3 py-4 text-center text-sm text-neutral-500">
            콜수행자가 작전을 시작하면 출발지·도착지와 진행 상태가 여기에 표시됩니다.
          </p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-white">오늘 복기</h2>
          <span className="text-xs text-neutral-500">운행 완료 기록 기준</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-900 p-3">
            <p className="text-xs text-neutral-500">완료 운행</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">{review.count}건</p>
          </div>
          <div className="bg-neutral-900 p-3">
            <p className="text-xs text-neutral-500">실수령</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-400">{review.net.toLocaleString()}원</p>
          </div>
          <div className="bg-neutral-900 p-3">
            <p className="text-xs text-neutral-500">목표까지</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-neutral-200">
              {settings.dailyTarget > 0 ? `${review.targetLeft.toLocaleString()}원` : '—'}
            </p>
          </div>
        </div>
      </section>

      {notice && (
        <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center">
          <span className="rounded-full bg-neutral-800 px-4 py-2 text-sm text-white shadow-lg">{notice}</span>
        </div>
      )}
    </div>
  )
}
