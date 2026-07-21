import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyOperation } from '../lib/operation'
import { isCloudSyncConfigured } from '../lib/supabase'
import { getTeamId } from '../storage/team'
import {
  fetchTeamOperation,
  saveTeamOperation,
  subscribeTeamOperation,
} from '../storage/teamOperation'
import { STORAGE_KEYS } from '../storage/keys'
import type { TeamOperation } from '../types/models'

function readLocalOperation(): TeamOperation {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.teamOperation)
    return raw ? { ...emptyOperation(), ...(JSON.parse(raw) as Partial<TeamOperation>) } : emptyOperation()
  } catch {
    return emptyOperation()
  }
}

function saveLocalOperation(operation: TeamOperation): void {
  localStorage.setItem(STORAGE_KEYS.teamOperation, JSON.stringify(operation))
}

// 현재 작전은 로컬에서 즉시 갱신하고, 팀이 연결돼 있으면 Realtime으로 동기화한다.
export function useTeamOperation() {
  const teamId = getTeamId()
  const [operation, setOperation] = useState<TeamOperation>(readLocalOperation)
  const [syncError, setSyncError] = useState('')
  const latest = useRef(operation)

  const apply = useCallback((next: TeamOperation) => {
    latest.current = next
    setOperation(next)
    saveLocalOperation(next)
  }, [])

  useEffect(() => {
    if (!isCloudSyncConfigured || !teamId) return
    let alive = true
    let unsubscribe: () => void = () => undefined

    const sync = async () => {
      try {
        const remote = await fetchTeamOperation(teamId)
        if (!alive) return
        if (remote) apply(remote)
        else await saveTeamOperation(teamId, latest.current)
        unsubscribe = subscribeTeamOperation(teamId, (next) => {
          if (alive) apply(next)
        })
        setSyncError('')
      } catch {
        if (alive) setSyncError('현재 작전 동기화에 실패했어요. 이 기기에는 계속 저장됩니다.')
      }
    }

    void sync()
    return () => {
      alive = false
      unsubscribe()
    }
  }, [apply, teamId])

  const updateOperation = useCallback(
    (patch: Partial<TeamOperation>) => {
      const next = { ...latest.current, ...patch, updatedAt: new Date().toISOString() }
      apply(next)
      if (isCloudSyncConfigured && teamId) {
        void saveTeamOperation(teamId, next).then(
          () => setSyncError(''),
          () => setSyncError('현재 작전 동기화에 실패했어요. 이 기기에는 계속 저장됩니다.'),
        )
      }
    },
    [apply, teamId],
  )

  return {
    operation,
    updateOperation,
    syncError,
    isShared: Boolean(isCloudSyncConfigured && teamId),
  }
}
