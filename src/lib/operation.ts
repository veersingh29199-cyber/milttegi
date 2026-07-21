import type { CallerStatus, FollowerStatus, OperationStage, TeamOperation } from '../types/models'

export const CALLER_STATUS_LABEL: Record<CallerStatus, string> = {
  ready: '대기',
  pickup: '픽업 이동',
  driving: '운행 중',
}

export const FOLLOWER_STATUS_LABEL: Record<FollowerStatus, string> = {
  ready: '대기',
  following: '동행 중',
  waiting: '대기 위치',
}

export const OPERATION_STAGE_LABEL: Record<OperationStage, string> = {
  idle: '대기 중',
  pickup: '픽업 이동',
  driving: '운행 중',
}

export function emptyOperation(now = new Date().toISOString()): TeamOperation {
  return {
    stage: 'idle',
    callerStatus: 'ready',
    followerStatus: 'ready',
    fromText: '',
    toText: '',
    fare: 0,
    platformId: '',
    startedAt: null,
    updatedAt: now,
  }
}

export function isActiveOperation(operation: TeamOperation): boolean {
  return operation.stage !== 'idle'
}

export function operationRoute(operation: TeamOperation): string {
  if (!operation.fromText && !operation.toText) return '현재 진행 중인 콜이 없습니다'
  return `${operation.fromText || '출발지 미입력'} → ${operation.toText || '도착지 미입력'}`
}
