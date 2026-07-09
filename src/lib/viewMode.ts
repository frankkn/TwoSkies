// 檢視模式是裝置人體工學偏好，存本機不同步雲端（手機擠、桌機寬——跟帳號無關）
export type ViewMode = 'split' | 'focus'

const KEY = 'twoskies.viewMode'

export function readViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'focus' ? 'focus' : 'split'
  } catch {
    return 'split'
  }
}

export function writeViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Safari 私密模式等會 throw——偏好存不住就每次都是預設，不致命
  }
}
