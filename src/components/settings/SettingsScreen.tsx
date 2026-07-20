import { useRef, useState } from 'react'
import type { Settings } from '../../types/models'
import { getSettings, saveSettings, exportAll, importAll, clearAll } from '../../storage/store'
import { SCHEMA_VERSION } from '../../storage/keys'
import { districtName } from '../../data/regions'
import { newId } from '../../lib/id'
import { toLocalISO } from '../../lib/time'
import { RegionSheet } from '../record/RegionSheet'

// '내 값으로 수정하세요' 배지 — 초기값이 임의라 반드시 고쳐야 하는 항목 표시.
function EditBadge() {
  return (
    <span className="ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[11px] text-amber-300">
      수정 요망
    </span>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-200">{title}</h2>
      {children}
    </section>
  )
}

// 설정 탭. 모든 변경은 즉시 저장되고, 탭을 나갔다 오면 다른 화면에 반영된다.
export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(getSettings)
  const [favSheet, setFavSheet] = useState(false)
  const [zoneParentSheet, setZoneParentSheet] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 변경분을 병합해 저장하고 화면 상태도 갱신한다.
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }
  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1600)
  }

  // --- 내보내기: 현재 데이터를 JSON 파일로 저장 ---
  const handleExport = () => {
    const bundle = exportAll()
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = toLocalISO(new Date()).slice(0, 10).replace(/-/g, '')
    a.href = url
    a.download = `운행일지-백업-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('백업 파일을 내보냈어요')
  }

  // --- 가져오기: JSON을 읽어 확인 후 전체 교체 ---
  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const bundle = JSON.parse(String(reader.result))
        if (!Array.isArray(bundle.trips) || !bundle.settings) throw new Error('형식 오류')
        if (!window.confirm('현재 데이터를 이 파일 내용으로 교체할까요? (되돌릴 수 없어요)')) return
        importAll(bundle)
        window.location.reload()
      } catch {
        flash('가져오기 실패: 올바른 백업 파일이 아니에요')
      }
    }
    reader.readAsText(file)
  }

  // --- 전체 삭제: 2단계 확인 ---
  const handleClearAll = () => {
    if (!window.confirm('모든 기록·설정을 삭제할까요?')) return
    if (!window.confirm('정말 삭제합니다. 되돌릴 수 없어요. 진행할까요?')) return
    clearAll()
    window.location.reload()
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-4 pb-24">
      <h1 className="text-lg font-bold text-white">설정</h1>

      {/* 1. 플랫폼 수수료율 */}
      <Section title={<>플랫폼 수수료율<EditBadge /></>}>
        <div className="flex flex-col gap-2">
          {settings.platforms.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                aria-label={`플랫폼 ${i + 1} 이름`}
                value={p.name}
                onChange={(e) => {
                  const platforms = settings.platforms.map((x) =>
                    x.id === p.id ? { ...x, name: e.target.value } : x,
                  )
                  update({ platforms })
                }}
                className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
              />
              <div className="flex items-center gap-1">
                <input
                  aria-label={`${p.name} 수수료율(%)`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  value={Math.round(p.feeRate * 1000) / 10}
                  onChange={(e) => {
                    const pct = Number(e.target.value)
                    const feeRate = Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : 0
                    const platforms = settings.platforms.map((x) =>
                      x.id === p.id ? { ...x, feeRate } : x,
                    )
                    update({ platforms })
                  }}
                  className="w-20 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-right text-sm text-white tabular-nums"
                />
                <span className="text-sm text-neutral-400">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          실제 수수료율은 수시로 바뀌어요. 본인 정산 기준으로 직접 맞추세요.
        </p>
      </Section>

      {/* 2. 최소 시급 */}
      <Section title={<>최소 시급<EditBadge /></>}>
        <div className="flex items-center gap-2">
          <input
            aria-label="최소 시급(원)"
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={settings.minHourly}
            onChange={(e) => update({ minHourly: Math.max(0, Number(e.target.value) || 0) })}
            className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-right text-sm text-white tabular-nums"
          />
          <span className="text-sm text-neutral-400">원 / 시</span>
        </div>
      </Section>

      {/* 2-b. 하루 목표액 */}
      <Section title={<>하루 목표액<EditBadge /></>}>
        <div className="flex items-center gap-2">
          <input
            aria-label="하루 목표액(원)"
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            value={settings.dailyTarget}
            onChange={(e) => update({ dailyTarget: Math.max(0, Number(e.target.value) || 0) })}
            className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-right text-sm text-white tabular-nums"
          />
          <span className="text-sm text-neutral-400">원 / 일</span>
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          실수령 기준. 기록 탭 상단 진행바에 표시돼요. 0으로 두면 진행바를 숨깁니다.
        </p>
      </Section>

      {/* 3. 즐겨찾기 관리 */}
      <Section title="즐겨찾기 지역">
        <div className="flex flex-wrap gap-2">
          {settings.favorites.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => update({ favorites: settings.favorites.filter((c) => c !== code) })}
              className="flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200"
            >
              {districtName(code)} <span className="text-neutral-500">✕</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFavSheet(true)}
            className="rounded-full border border-emerald-700 px-3 py-1.5 text-sm text-emerald-300"
          >
            + 추가
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-600">칩을 누르면 삭제돼요.</p>
      </Section>

      {/* 4. 내 구역 관리 */}
      <Section title="내 구역">
        <div className="flex flex-col gap-2">
          {settings.customZones.map((z) => (
            <div key={z.id} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-neutral-500">{districtName(z.parentCode)}</span>
              <input
                aria-label="구역 이름"
                value={z.name}
                onChange={(e) => {
                  const customZones = settings.customZones.map((x) =>
                    x.id === z.id ? { ...x, name: e.target.value } : x,
                  )
                  update({ customZones })
                }}
                className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() =>
                  update({ customZones: settings.customZones.filter((x) => x.id !== z.id) })
                }
                aria-label="구역 삭제"
                className="rounded-lg px-2 py-2 text-sm text-red-400"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            aria-label="새 구역 이름"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            placeholder="예: 명지 외곽"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => {
              if (!newZoneName.trim()) {
                flash('구역 이름을 입력하세요')
                return
              }
              setZoneParentSheet(true)
            }}
            className="shrink-0 rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-300"
          >
            상위 지역 선택 →
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          이름에 '중심/외곽'을 넣으면 기피 프리미엄 리포트에 쓰여요.
        </p>
      </Section>

      {/* 5. 데이터 내보내기/가져오기 */}
      <Section title="데이터 백업">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 rounded-lg bg-neutral-800 py-2.5 text-sm text-neutral-200"
          >
            내보내기 (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-lg bg-neutral-800 py-2.5 text-sm text-neutral-200"
          >
            가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = '' // 같은 파일 재선택 허용
            }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          가져오기는 현재 데이터를 파일 내용으로 <b>교체</b>해요(확인 후).
        </p>
      </Section>

      {/* 6. 전체 삭제 */}
      <Section title="위험 구역">
        <button
          type="button"
          onClick={handleClearAll}
          className="w-full rounded-lg border border-red-800 bg-red-950/40 py-2.5 text-sm font-semibold text-red-400"
        >
          모든 데이터 삭제
        </button>
      </Section>

      {/* 7. 앱 정보 */}
      <Section title="앱 정보">
        <ul className="flex flex-col gap-1 text-sm text-neutral-400">
          <li>운행일지·작전판 (개인용)</li>
          <li>데이터 버전: {SCHEMA_VERSION}</li>
          <li>저장 위치: 이 기기 브라우저(localStorage) — 서버 없음</li>
        </ul>
      </Section>

      {/* 즐겨찾기 추가 바텀시트 */}
      <RegionSheet
        open={favSheet}
        recentCodes={[]}
        onSelect={(code) => {
          if (!settings.favorites.includes(code)) {
            update({ favorites: [...settings.favorites, code] })
          }
          setFavSheet(false)
        }}
        onClose={() => setFavSheet(false)}
      />

      {/* 새 구역 상위 지역 선택 바텀시트 */}
      <RegionSheet
        open={zoneParentSheet}
        recentCodes={[]}
        onSelect={(code) => {
          update({
            customZones: [
              ...settings.customZones,
              { id: newId(), parentCode: code, name: newZoneName.trim() },
            ],
          })
          setNewZoneName('')
          setZoneParentSheet(false)
          flash('내 구역을 추가했어요')
        }}
        onClose={() => setZoneParentSheet(false)}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center">
          <span className="rounded-full bg-neutral-800/95 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </span>
        </div>
      )}
    </div>
  )
}
