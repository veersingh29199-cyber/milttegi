import { SCHEMA_VERSION } from './keys'

// 저장된 데이터의 스냅샷(마이그레이션이 다루는 원본 덩어리).
// 구조가 바뀔 때 이 안의 값들을 옛 모양 → 새 모양으로 바꾼다.
export interface StoreSnapshot {
  settings: unknown
  trips: unknown
  dailyExpenses: unknown
}

// 마이그레이션 1개 = "버전 N의 데이터를 버전 N+1 모양으로 바꾸는 함수".
type Migration = (snapshot: StoreSnapshot) => StoreSnapshot

// 버전별 변환 함수 표. 지금은 v1뿐이라 변환이 없다(뼈대만 유지).
// 나중에 구조가 바뀌면 예: migrations[1] = (s) => { ...v1→v2 변환...; return s }
const migrations: Record<number, Migration> = {}

// 저장된 버전(fromVersion)의 스냅샷을 최신 스키마(SCHEMA_VERSION)까지
// 순서대로 끌어올린다. 반환값: [올라간 버전, 변환된 스냅샷].
// 지금은 변환 로직이 없어 그대로 통과시키지만, 앱 시작 시 이 흐름을 항상 태워
// 나중에 로직만 채우면 되도록 배선해 둔다.
export function migrate(fromVersion: number, snapshot: StoreSnapshot): [number, StoreSnapshot] {
  let version = fromVersion
  let current = snapshot
  while (version < SCHEMA_VERSION) {
    const step = migrations[version]
    if (!step) break // 해당 버전 변환이 없으면 멈춘다(뼈대 상태).
    current = step(current)
    version += 1
  }
  return [SCHEMA_VERSION, current]
}
