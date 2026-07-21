import { useState, useCallback, useEffect, useRef } from 'react'
import {
  getDeletedTripIds,
  getTrips,
  saveDeletedTripIds,
  saveTrips,
} from '../storage/store'
import {
  deleteCloudTrip,
  fetchCloudTrips,
  upsertCloudTrips,
} from '../storage/cloudTrips'
import { getTeamId } from '../storage/team'
import type { Trip } from '../types/models'

// 두 목록을 id 기준으로 합친다(중복은 뒤쪽 것이 이김).
// 화면이 들고 있던 기록과 저장소에서 읽은 기록을 하나로 모을 때 쓴다.
// 비유: 손에 든 수첩과 서랍 속 장부를 번호로 대조해 한 권으로 합치는 것.
export function mergeById(a: Trip[], b: Trip[]): Trip[] {
  const byId = new Map<string, Trip>()
  for (const t of [...a, ...b]) byId.set(t.id, t)
  return [...byId.values()]
}

// 운행 기록 목록을 다루는 훅.
// 화면 상태와 localStorage를 함께 갱신해, 새로고침해도 데이터가 남는다.
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>(getTrips)
  // 저장에 실패했을 때 사용자에게 보여줄 경고(빈 문자열이면 정상).
  const [saveError, setSaveError] = useState('')
  const [syncError, setSyncError] = useState('')
  // 화면이 들고 있는 최신 목록. 저장소가 말썽이어도 이 값은 남아 있어
  // 방금 입력한 기록이 사라지지 않는다.
  const latest = useRef<Trip[]>(trips)

  // 저장 + 화면 상태 갱신을 한 번에.
  // 화면을 먼저 갱신하고 저장을 시도한다 — 저장이 실패해도 입력분을 잃지 않기 위해서.
  const persist = useCallback((next: Trip[]) => {
    latest.current = next
    setTrips(next)
    try {
      saveTrips(next)
      // 정말 기록됐는지 되읽어 확인한다.
      // 저장공간 부족·저장소 차단은 예외 없이 조용히 실패하는 경우가 있다.
      if (getTrips().length !== next.length) throw new Error('저장 확인 실패')
      setSaveError('')
    } catch {
      setSaveError('기기에 저장하지 못했어요. 저장공간이 부족하거나 브라우저가 저장을 막고 있습니다.')
    }
  }, [])

  const syncFromCloud = useCallback(async () => {
    const teamId = getTeamId()
    if (!teamId) return

    try {
      const { activeTrips, deletedIds } = await fetchCloudTrips(teamId)
      const localDeletedIds = getDeletedTripIds()
      const deleted = new Set([...localDeletedIds, ...deletedIds])
      saveDeletedTripIds([...deleted])

      const localAlive = latest.current.filter((trip) => !deleted.has(trip.id))
      const merged = mergeById(localAlive, activeTrips)
      latest.current = merged
      setTrips(merged)
      saveTrips(merged)

      const cloudIds = new Set(activeTrips.map((trip) => trip.id))
      const missingInCloud = merged.filter((trip) => !cloudIds.has(trip.id))
      await upsertCloudTrips(teamId, missingInCloud)
      setSyncError('')
    } catch {
      setSyncError('팀 기록을 불러오지 못했어요. 인터넷 연결과 Supabase 설정을 확인하세요.')
    }
  }, [])

  useEffect(() => {
    void syncFromCloud()
    const timer = window.setInterval(() => void syncFromCloud(), 30000)
    return () => window.clearInterval(timer)
  }, [syncFromCloud])

  // 지금 기준이 되는 목록: 화면이 든 것과 저장본을 합친 것.
  // 다른 탭에서 바뀐 내용도 반영되고, 저장본이 비어 있어도 화면 것이 살아남는다.
  const current = useCallback(() => mergeById(latest.current, getTrips()), [])

  const addTrip = useCallback(
    (t: Trip) => {
      const next = [...current(), t]
      persist(next)
      const teamId = getTeamId()
      if (teamId) void upsertCloudTrips(teamId, [t]).catch(() => setSyncError('팀 기록에 저장하지 못했어요. 로컬에는 저장됐습니다.'))
    },
    [persist, current],
  )

  // 운행내역 사진처럼 여러 건을 가져올 때는 한 번만 저장·동기화한다.
  const addTrips = useCallback(
    (newTrips: Trip[]) => {
      if (newTrips.length === 0) return
      persist([...current(), ...newTrips])
      const teamId = getTeamId()
      if (teamId) {
        void upsertCloudTrips(teamId, newTrips).catch(() =>
          setSyncError('팀 기록에 가져온 운행을 저장하지 못했어요. 로컬에는 저장됐습니다.'),
        )
      }
    },
    [persist, current],
  )

  const updateTrip = useCallback(
    (t: Trip) => {
      persist(current().map((x) => (x.id === t.id ? t : x)))
      const teamId = getTeamId()
      if (teamId) void upsertCloudTrips(teamId, [t]).catch(() => setSyncError('팀 기록에 수정사항을 저장하지 못했어요. 로컬에는 저장됐습니다.'))
    },
    [persist, current],
  )

  const deleteTrip = useCallback(
    (id: string) => {
      saveDeletedTripIds([...getDeletedTripIds(), id])
      persist(current().filter((x) => x.id !== id))
      const teamId = getTeamId()
      if (teamId) void deleteCloudTrip(teamId, id).catch(() => setSyncError('팀 기록 삭제를 동기화하지 못했어요. 로컬에서는 삭제됐습니다.'))
    },
    [persist, current],
  )

  return { trips, addTrip, addTrips, updateTrip, deleteTrip, saveError, syncError, syncFromCloud }
}
