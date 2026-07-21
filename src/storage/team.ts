import { STORAGE_KEYS } from './keys'
import type { TeamRole } from '../types/models'

export function getTeamId(): string {
  return localStorage.getItem(STORAGE_KEYS.teamId) ?? ''
}

export function saveTeamId(teamId: string): void {
  localStorage.setItem(STORAGE_KEYS.teamId, teamId)
}

export function clearTeamId(): void {
  localStorage.removeItem(STORAGE_KEYS.teamId)
}

export function newTeamId(): string {
  return crypto.randomUUID()
}

export function getTeamRole(): TeamRole {
  return localStorage.getItem(STORAGE_KEYS.teamRole) === 'follower' ? 'follower' : 'caller'
}

export function saveTeamRole(role: TeamRole): void {
  localStorage.setItem(STORAGE_KEYS.teamRole, role)
}
