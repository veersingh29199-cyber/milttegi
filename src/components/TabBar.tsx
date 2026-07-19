// 하단 고정 탭바. 한 손 엄지로 닿는 위치에 3개 탭을 둔다.
export type TabKey = 'record' | 'board' | 'settings'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'record', label: '기록', icon: '✏️' },
  { key: 'board', label: '작전판', icon: '🗺️' },
  { key: 'settings', label: '설정', icon: '⚙️' },
]

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (key: TabKey) => void
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-800 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="주요 화면 이동"
    >
      {TABS.map((tab) => {
        const on = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={on ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              on ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
