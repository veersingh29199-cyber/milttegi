// 시각(at)은 타임존 오프셋 없는 "로컬 시각" 문자열로 다룬다.
// 예: '2026-07-19T21:15:00'. 이 앱은 KST 전용이라 저장·표시·계산이 모두
// 로컬 기준으로 일관되게 동작한다(2단계 계산 테스트와 동일한 경로).

// 두 자리 0채움 헬퍼.
function p(n: number): string {
  return String(n).padStart(2, '0')
}

// Date 객체를 로컬 ISO 문자열('YYYY-MM-DDTHH:mm:ss')로 바꾼다.
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`
}

// 지금 시각을 초를 0으로 맞춘 로컬 ISO로 반환(기록 기본값).
export function nowLocalISO(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  return toLocalISO(d)
}

// 로컬 ISO → 폰의 <input type="datetime-local"> 값('YYYY-MM-DDTHH:mm').
export function toDatetimeLocalValue(iso: string): string {
  return iso.slice(0, 16)
}

// datetime-local 값 → 로컬 ISO(초 00 보강).
export function fromDatetimeLocalValue(v: string): string {
  return v.length === 16 ? `${v}:00` : v
}

// 표시용 시:분('HH:mm').
export function formatHm(iso: string): string {
  return iso.slice(11, 16)
}

// 표시용 월/일 시:분('7/19 21:15').
export function formatMdHm(iso: string): string {
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return `${month}/${day} ${formatHm(iso)}`
}
