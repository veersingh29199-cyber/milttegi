import { supabase } from '../lib/supabase'
import type { TeamOperation } from '../types/models'
import { emptyOperation } from '../lib/operation'

interface TeamOperationRow {
  payload: TeamOperation | null
}

async function requireSession() {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData.session) return sessionData.session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!data.session) throw new Error('익명 로그인 세션을 만들지 못했습니다.')
  return data.session
}

export async function fetchTeamOperation(teamId: string): Promise<TeamOperation | null> {
  await requireSession()
  const { data, error } = await supabase!
    .from('team_operations')
    .select('payload')
    .eq('team_id', teamId)
    .maybeSingle()
  if (error) throw error
  return (data as TeamOperationRow | null)?.payload ?? null
}

export async function saveTeamOperation(teamId: string, operation: TeamOperation): Promise<void> {
  await requireSession()
  const { error } = await supabase!.from('team_operations').upsert(
    { team_id: teamId, payload: operation },
    { onConflict: 'team_id' },
  )
  if (error) throw error
}

export function subscribeTeamOperation(
  teamId: string,
  onChange: (operation: TeamOperation) => void,
): () => void {
  const client = supabase
  if (!client) return () => undefined

  const channel = client
    .channel(`team-operation:${teamId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'team_operations', filter: `team_id=eq.${teamId}` },
      (change) => {
        const row = change.new as TeamOperationRow
        onChange(row.payload ?? emptyOperation())
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
