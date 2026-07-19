import { useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { RecordScreen } from './components/record/RecordScreen'
import { BoardScreen } from './components/board/BoardScreen'

// 앱 셸: 하단 3탭 사이를 전환한다.
// 기록 탭은 3단계에서 완성. 작전판(4단계)·설정(5단계)은 임시 안내만 둔다.
function App() {
  const [tab, setTab] = useState<TabKey>('record')

  return (
    <div className="min-h-full">
      {tab === 'record' && <RecordScreen />}
      {tab === 'board' && <BoardScreen />}
      {tab === 'settings' && <Placeholder title="설정" note="5단계에서 만들어요." />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

// 아직 만들지 않은 탭의 임시 안내 화면.
function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-2 px-4">
      <h1 className="text-lg font-bold text-white">{title}</h1>
      <p className="text-sm text-neutral-500">{note}</p>
    </div>
  )
}

export default App
