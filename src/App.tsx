import { useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { RecordScreen } from './components/record/RecordScreen'
import { BoardScreen } from './components/board/BoardScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'

// 앱 셸: 하단 3탭 사이를 전환한다.
// 기록 탭은 3단계에서 완성. 작전판(4단계)·설정(5단계)은 임시 안내만 둔다.
function App() {
  const [tab, setTab] = useState<TabKey>('record')

  return (
    <div className="min-h-full">
      {tab === 'record' && <RecordScreen />}
      {tab === 'board' && <BoardScreen />}
      {tab === 'settings' && <SettingsScreen />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

export default App
