import { useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { RecordScreen } from './components/record/RecordScreen'
import { BoardScreen } from './components/board/BoardScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'

// 앱 셸: 기록, 현재 작전, 설정의 세 화면을 전환한다.
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
