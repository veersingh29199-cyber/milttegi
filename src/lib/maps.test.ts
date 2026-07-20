import { describe, it, expect } from 'vitest'
import { mapUrl } from './maps'

describe('mapUrl — 지도앱 길찾기 링크', () => {
  it('구글은 현위치→목적지 경로 URL', () => {
    expect(mapUrl('google', '신호동 롯데마트')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=%EC%8B%A0%ED%98%B8%EB%8F%99%20%EB%A1%AF%EB%8D%B0%EB%A7%88%ED%8A%B8',
    )
  })
  it('카카오는 검색 링크', () => {
    expect(mapUrl('kakao', '명지')).toBe('https://map.kakao.com/link/search/%EB%AA%85%EC%A7%80')
  })
  it('티맵은 앱 스킴', () => {
    expect(mapUrl('tmap', '동래역')).toBe('tmap://search?name=%EB%8F%99%EB%9E%98%EC%97%AD')
  })
  it('앞뒤 공백은 제거하고 인코딩', () => {
    expect(mapUrl('kakao', '  강서구  ')).toBe('https://map.kakao.com/link/search/%EA%B0%95%EC%84%9C%EA%B5%AC')
  })
})
