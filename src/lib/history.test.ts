import { describe, expect, it } from 'vitest'
import { filterHistory, groupHistoryByDay, historyNetTotal } from './history'
import { DEFAULT_SETTINGS } from '../storage/store'
import type { Trip } from '../types/models'

const trips: Trip[] = [
  {
    id: 'tmap-1', at: '2026-07-20T22:56:00', platformId: 'tmap', from: '26230', to: '48250',
    fromDetail: '당감동', toDetail: '지내동', fare: 21600, paymentMethod: 'cash', rain: false, event: false,
  },
  {
    id: 'kakao-1', at: '2026-07-20T21:06:00', platformId: 'kakao', from: '26410', to: '26410',
    fromDetail: '구서동', toDetail: '대청동1가', fare: 19200, paymentMethod: 'card', rain: false, event: false,
  },
  {
    id: 'tmap-2', at: '2026-07-19T02:23:00', platformId: 'tmap', from: '48330', to: '48310',
    fromDetail: '복정동', toDetail: '평산동', fare: 18400, rain: false, event: false,
  },
]

describe('운행내역 필터', () => {
  it('월, 플랫폼, 동 이름으로 운행을 찾는다', () => {
    expect(filterHistory(trips, { month: '2026-07', platformId: 'tmap', keyword: '당감' }).map((trip) => trip.id))
      .toEqual(['tmap-1'])
  })

  it('날짜별로 묶고 실수령 합계를 계산한다', () => {
    const grouped = groupHistoryByDay(trips, DEFAULT_SETTINGS)

    expect(grouped[0]).toMatchObject({ date: '2026-07-20', net: 40800 })
    expect(historyNetTotal(trips, DEFAULT_SETTINGS)).toBe(59200)
  })
})
