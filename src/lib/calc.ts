import type { Settings, Trip } from '../types/models'

// 이 파일은 화면과 완전히 분리된 "순수 함수"만 모은 계산기다.
// 순수 함수 = 같은 입력이면 항상 같은 출력, 바깥 상태를 건드리지 않음.
// 그래서 2단계에서 이 함수들만 단위 테스트로 딱딱 고정할 수 있다.

const MS_PER_MIN = 60_000

// 실수령액 = 표시 요금 × (1 − 수수료율).
// 원화는 소수점이 없으므로 원 단위로 반올림한다(부동소수 오차 방지 겸).
export function netFare(fare: number, feeRate: number): number {
  return Math.round(fare * (1 - feeRate))
}

// 한 건의 실수령액을 "요금 입력 기준(settings.fareIsNet)"에 맞게 계산한다.
// fareIsNet=true: 입력한 요금이 이미 수수료를 뗀 실수령 → 그대로 사용(이중 차감 방지).
// fareIsNet=false: 표시 요금 → 플랫폼 수수료율을 적용.
export function tripNet(fare: number, platformId: string, settings: Settings): number {
  if (settings.fareIsNet) return Math.round(fare)
  const feeRate = settings.platforms.find((p) => p.id === platformId)?.feeRate ?? 0
  return netFare(fare, feeRate)
}

// 회전 간격(분) = 다음 기록 시각 − 이번 기록 시각.
// at은 "운행 종료" 시각이다. 음수가 나오면 입력 순서 문제이므로 0으로 막지 않고 그대로 반환한다.
export function turnGapMin(fromISO: string, toISO: string): number {
  return (new Date(toISO).getTime() - new Date(fromISO).getTime()) / MS_PER_MIN
}

// 영업일 경계는 오전 6시. 06시 이전(새벽) 기록은 전날 영업일로 귀속한다.
// 반환: 그 기록이 속한 영업일의 'YYYY-MM-DD'(현지 시각 기준).
export function businessDay(iso: string): string {
  const d = new Date(iso)
  d.setHours(d.getHours() - 6) // 6시간 당기면 06시가 자정이 되어 날짜 경계가 06시로 이동
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 영업일 기준 요일. 0=일 … 6=토. (새벽 2시 기록은 전날 요일로 귀속)
export function businessWeekday(iso: string): number {
  const d = new Date(iso)
  d.setHours(d.getHours() - 6)
  return d.getDay()
}

// 한 세션(연속 근무 한 묶음)의 결과.
export interface Session {
  trips: Trip[] // 시간순으로 정렬된 이 세션의 기록들
  lastCallId: string // 막콜(세션의 마지막 기록) id — 회전 통계에서 제외 대상
}

// 기록 목록을 세션 단위로 자른다.
// 규칙: 회전 간격 > sessionGapMin 이면 근무 종료로 보고 세션을 끊는다.
// 각 세션의 마지막 기록이 막콜이다(복귀 곤란 신호 분석의 재료).
export function splitSessions(trips: Trip[], sessionGapMin: number): Session[] {
  // 원본을 건드리지 않도록 복사 후 시각 오름차순 정렬.
  const sorted = [...trips].sort((a, b) => a.at.localeCompare(b.at))
  const sessions: Session[] = []
  let current: Trip[] = []
  for (let i = 0; i < sorted.length; i++) {
    current.push(sorted[i])
    const next = sorted[i + 1]
    // 다음 기록이 없으면(마지막) 간격을 무한대로 봐 세션을 끊는다.
    const gap = next ? turnGapMin(sorted[i].at, next.at) : Infinity
    if (gap > sessionGapMin) {
      sessions.push({ trips: current, lastCallId: current[current.length - 1].id })
      current = []
    }
  }
  return sessions
}

// 세션 시간(분) = 세션 마지막 기록 at − 첫 기록 at.
// 한계: 기록 1건짜리 세션은 시간이 0이라 시급 계산에서 제외해야 한다(호출부에서 판단).
export function sessionDurationMin(session: Session): number {
  const { trips } = session
  if (trips.length < 2) return 0
  return turnGapMin(trips[0].at, trips[trips.length - 1].at)
}

// 일 순수익 = 그 영업일 실수령 합 − 그 영업일 경비.
export function dailyNetProfit(netSum: number, expense: number): number {
  return netSum - expense
}
