import { useState, useCallback } from 'react'
import { getTrips, saveTrips } from '../storage/store'
import type { Trip } from '../types/models'

// 운행 기록 목록을 다루는 훅.
// 화면 상태와 localStorage를 함께 갱신해, 새로고침해도 데이터가 남는다.
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>(getTrips)

  // 저장 + 화면 상태 갱신을 한 번에. 항상 최신 저장본을 기준으로 계산해
  // 오래된 상태(stale closure)로 덮어쓰는 실수를 막는다.
  const persist = useCallback((next: Trip[]) => {
    saveTrips(next)
    setTrips(next)
  }, [])

  const addTrip = useCallback(
    (t: Trip) => {
      persist([...getTrips(), t])
    },
    [persist],
  )

  const updateTrip = useCallback(
    (t: Trip) => {
      persist(getTrips().map((x) => (x.id === t.id ? t : x)))
    },
    [persist],
  )

  const deleteTrip = useCallback(
    (id: string) => {
      persist(getTrips().filter((x) => x.id !== id))
    },
    [persist],
  )

  return { trips, addTrip, updateTrip, deleteTrip }
}
