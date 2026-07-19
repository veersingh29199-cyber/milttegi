import { verifyRegionCounts } from './data/regions'
import { getSettings } from './storage/store'
import { SCHEMA_VERSION } from './storage/keys'

// 1단계 임시 화면.
// 아직 실제 UI(기록/작전판/설정 탭)는 없다. 뼈대가 제대로 섰는지
// 눈으로 확인할 수 있게 지역 개수 검증 결과와 저장 계층 상태만 보여준다.
// 2단계 이후 이 화면은 통째로 교체된다.
function App() {
  const check = verifyRegionCounts()
  const settings = getSettings()

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-bold text-white">운행일지·작전판</h1>
        <p className="text-sm text-neutral-400">1단계 뼈대 확인 화면 (개발용)</p>
      </header>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">지역 데이터 자체 검증</h2>
        <p className={check.ok ? 'text-emerald-400' : 'text-red-400'}>
          {check.ok ? '✓ 통과' : '✗ 실패'} · 총 {check.total}개
        </p>
        <ul className="mt-2 space-y-1 text-sm text-neutral-400">
          {Object.entries(check.counts).map(([name, n]) => (
            <li key={name}>
              {name}: {n}개
            </li>
          ))}
        </ul>
        {check.duplicates.length > 0 && (
          <p className="mt-2 text-sm text-red-400">중복 코드: {check.duplicates.join(', ')}</p>
        )}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">저장 계층</h2>
        <ul className="space-y-1 text-sm text-neutral-400">
          <li>스키마 버전: {SCHEMA_VERSION}</li>
          <li>플랫폼: {settings.platforms.map((p) => p.name).join(', ')}</li>
          <li>즐겨찾기: {settings.favorites.length}개</li>
          <li>내 구역: {settings.customZones.map((z) => z.name).join(', ')}</li>
          <li>최소 시급: {settings.minHourly.toLocaleString()}원</li>
        </ul>
      </section>
    </div>
  )
}

export default App
