import { supabase } from '../lib/supabase'
import type { Trip } from '../types/models'

interface SharedTripRow {
  id: string
  payload: Trip | null
  deleted_at: string | null
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

export async function joinCloudTeam(teamId: string): Promise<void> {
  await requireSession()
  const { data, error: userError } = await supabase!.auth.getUser()
  if (userError) throw userError
  if (!data.user) throw new Error('사용자 세션을 확인하지 못했습니다.')

  const { error } = await supabase!.from('team_members').upsert(
    {
      team_id: teamId,
      user_id: data.user.id,
    },
    { onConflict: 'team_id,user_id' },
  )
  if (error) throw error
}

export async function fetchCloudTrips(teamId: string): Promise<{
  activeTrips: Trip[]
  deletedIds: string[]
}> {
  await requireSession()
  const { data, error } = await supabase!
    .from('shared_trips')
    .select('id,payload,deleted_at')
    .eq('team_id', teamId)

  if (error) throw error

  const rows = (data ?? []) as SharedTripRow[]
  return {
    activeTrips: rows.flatMap((row) => (row.deleted_at || !row.payload ? [] : [row.payload])),
    deletedIds: rows.flatMap((row) => (row.deleted_at ? [row.id] : [])),
  }
}

export async function upsertCloudTrips(teamId: string, trips: Trip[]): Promise<void> {
  if (trips.length === 0) return
  await requireSession()
  const { error } = await supabase!.from('shared_trips').upsert(
    trips.map((trip) => ({
      team_id: teamId,
      id: trip.id,
      payload: trip,
      deleted_at: null,
    })),
    { onConflict: 'team_id,id' },
  )
  if (error) throw error
}

export async function deleteCloudTrip(teamId: string, id: string): Promise<void> {
  await requireSession()
  const { error } = await supabase!
    .from('shared_trips')
    .update({ deleted_at: new Date().toISOString(), payload: null })
    .eq('team_id', teamId)
    .eq('id', id)
  if (error) throw error
}
