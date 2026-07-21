import { STORAGE_KEYS } from './keys'

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

