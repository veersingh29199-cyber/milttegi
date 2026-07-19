import { useState } from 'react'
import { getSettings } from '../storage/store'

// 설정을 한 번 읽어 화면에 제공한다.
// 기록 중에는 설정이 거의 바뀌지 않으므로 단순 로드로 충분하다.
// 설정 편집 화면은 5단계에서 붙인다.
export function useSettings() {
  const [settings] = useState(getSettings)
  return settings
}
