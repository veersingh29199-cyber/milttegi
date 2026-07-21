import { describe, expect, it } from 'vitest'
import { makeImportCandidates } from './historyImport'
import type { RecognizedTrip } from './parseScreenshot'
import type { Trip } from '../types/models'

const tmapRow: RecognizedTrip = {
  fromText: '당감동',
  fromCode: '26230',
  toText: '지내동',
  toCode: '48250',
  fare: 21600,
  dateISO: '2026-07-20',
  timeHHmm: '22:56',
  platformId: 'tmap',
  paymentMethod: 'cash',
  confidence: 0.99,
}

function candidates(recognized: RecognizedTrip[], existingTrips: Trip[] = []) {
  return makeImportCandidates({
    recognized,
    fallbackDate: '2026-07-21',
    fallbackPlatformId: 'kakao',
    knownPlatformIds: ['kakao', 'tmap'],
    existingTrips,
    createId: () => 'imported-id',
  })
}

describe('makeImportCandidates', () => {
  it('티맵 운행 내역의 날짜, 상세 지역, 결제수단, 실수령을 보존한다', () => {
    const trip = candidates([tmapRow])[0].trip

    expect(trip).toMatchObject({
      at: '2026-07-20T22:56:00',
      platformId: 'tmap',
      from: '26230',
      to: '48250',
      fromDetail: '당감동',
      toDetail: '지내동',
      fare: 21600,
      paymentMethod: 'cash',
    })
  })

  it('같은 운행을 다시 가져오면 저장 후보에서 제외한다', () => {
    const existing = candidates([tmapRow])[0].trip!
    const result = candidates([tmapRow], [existing])[0]

    expect(result.trip).toBeUndefined()
    expect(result.reason).toBe('이미 저장된 운행이에요')
  })

  it('날짜가 빠진 카카오 내역은 화면에서 고른 기준 날짜를 쓴다', () => {
    const result = candidates([{ ...tmapRow, dateISO: '', platformId: 'kakao', paymentMethod: '' }])[0].trip

    expect(result?.at).toBe('2026-07-21T22:56:00')
    expect(result?.platformId).toBe('kakao')
  })
})
