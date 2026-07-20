// 길찾기 handoff 유틸.
// 우리 앱은 아무 API도 호출하지 않는다. 입력한 목적지 텍스트를
// 폰에 깔린 지도앱으로 "넘기기"만 하고, 경로 계산·현위치는 그 지도앱이 처리한다.
// → "외부 API 금지·서버 없음" 원칙 유지.

export type MapApp = 'google' | 'kakao' | 'tmap'

export const MAP_LABEL: Record<MapApp, string> = {
  google: '구글지도',
  kakao: '카카오맵',
  tmap: '티맵',
}

// 목적지 텍스트로 각 지도앱의 열기 URL을 만든다.
// 구글: 현위치→목적지 경로. 카카오: 목적지 검색. 티맵: 앱 검색(스킴).
export function mapUrl(app: MapApp, query: string): string {
  const q = encodeURIComponent(query.trim())
  switch (app) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${q}`
    case 'kakao':
      return `https://map.kakao.com/link/search/${q}`
    case 'tmap':
      return `tmap://search?name=${q}`
  }
}

// 지도앱을 연다. http(s)는 새 탭, 커스텀 스킴(tmap://)은 현재 창에서 앱 전환.
export function openMap(app: MapApp, query: string): void {
  const url = mapUrl(app, query)
  if (url.startsWith('http')) {
    window.open(url, '_blank', 'noopener')
  } else {
    window.location.href = url
  }
}
