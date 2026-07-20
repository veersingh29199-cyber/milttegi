// 앱의 데이터 모양(타입) 정의.
// 파생값(실수령, 회전 간격, 시급)은 절대 저장하지 않는다 —
// 수수료율을 나중에 바꿔도 과거 통계가 함께 재계산되도록 항상 계산으로 구한다.

// 플랫폼 1개 = 대리운전 앱 하나(카카오/티맵 등)와 그 수수료율.
export interface Platform {
  id: string
  name: string
  feeRate: number // 0.20 = 20%. 실제 값은 수시 변동하므로 사용자가 직접 고친다.
}

// 내 구역: 시군구 하위에 발주자가 직접 만드는 커스텀 라벨(예: 신호단지, 명지 외곽).
export interface CustomZone {
  id: string
  parentCode: string // 상위 시군구 5자리 코드
  name: string
}

// 앱 전역 설정.
export interface Settings {
  platforms: Platform[]
  minHourly: number // 최소 시급 기준(원). 초기 15000, 사용자 수정 대상.
  dailyTarget: number // 하루 목표액(원, 실수령 기준). 초기값 임의, 사용자 수정 대상.
  favorites: string[] // 즐겨찾기 시군구 5자리 코드 목록
  customZones: CustomZone[]
  sessionGapMin: number // 세션 컷 기준(분). 기본 120, 설정 화면에는 숨김(상수 취급).
}

// 운행 1회 = 콜 1건 기록.
export interface Trip {
  id: string
  at: string // 운행 "종료" 시각(손님 내려준 직후), ISO 문자열
  platformId: string
  from: string // 출발 시군구 5자리 코드
  to: string // 도착 시군구 5자리 코드
  fromZone?: string // 내 구역 id (선택)
  toZone?: string // 내 구역 id (선택)
  fare: number // 표시 요금(원)
  rain: boolean
  event: boolean // 행사일(야구 등) 여부
  memo?: string
}

// 영업일(오전 6시 경계) 기준 날짜별 경비(유류비 등). 키는 'YYYY-MM-DD'.
export type DailyExpenses = Record<string, number>

// 지역 데이터(regions.json) 모양.
export interface RegionDistrict {
  code: string // 시군구 5자리 행정표준코드
  name: string
}
export interface RegionProvince {
  code: string // 시도 2자리 코드
  name: string
  shortName: string
  districts: RegionDistrict[]
}
export interface RegionsData {
  provinces: RegionProvince[]
}
