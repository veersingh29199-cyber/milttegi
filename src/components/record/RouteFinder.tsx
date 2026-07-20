import { useState } from 'react'
import { openMap, MAP_LABEL, type MapApp } from '../../lib/maps'

// 길찾기: 상호명/주소를 치고 지도앱 버튼을 누르면 그 앱이 현위치→목적지 경로를 띄운다.
export function RouteFinder() {
  const [query, setQuery] = useState('')
  const apps: MapApp[] = ['google', 'kakao', 'tmap']

  const go = (app: MapApp) => {
    if (!query.trim()) return
    openMap(app, query)
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
      <label className="mb-2 block text-sm font-medium text-neutral-300">
        길찾기 <span className="text-xs font-normal text-neutral-500">(상호명·주소)</span>
      </label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="예: 신호동 롯데마트 / 명지 오션시티"
        className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-600"
        aria-label="길찾기 목적지"
        enterKeyHint="search"
      />
      <div className="flex gap-2">
        {apps.map((app) => (
          <button
            key={app}
            type="button"
            onClick={() => go(app)}
            disabled={!query.trim()}
            className="flex-1 rounded-lg bg-neutral-800 py-2 text-sm text-neutral-200 disabled:opacity-40"
          >
            {MAP_LABEL[app]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-neutral-600">
        누르면 지도앱이 열려 현위치에서 경로를 안내해요.
      </p>
    </section>
  )
}
