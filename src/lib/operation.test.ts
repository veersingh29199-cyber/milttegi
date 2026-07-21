import { describe, expect, it } from 'vitest'
import { emptyOperation, isActiveOperation, operationRoute } from './operation'

describe('현재 작전 상태', () => {
  it('새 작전은 대기 상태로 시작한다', () => {
    const operation = emptyOperation('2026-07-22T12:00:00.000Z')
    expect(operation.stage).toBe('idle')
    expect(operation.callerStatus).toBe('ready')
    expect(operation.followerStatus).toBe('ready')
    expect(isActiveOperation(operation)).toBe(false)
  })

  it('진행 중인 콜은 출발지와 도착지를 함께 표시한다', () => {
    const operation = {
      ...emptyOperation(),
      stage: 'pickup' as const,
      fromText: '당감동',
      toText: '지내동',
    }
    expect(isActiveOperation(operation)).toBe(true)
    expect(operationRoute(operation)).toBe('당감동 → 지내동')
  })
})
