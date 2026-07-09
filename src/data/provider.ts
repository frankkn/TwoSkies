import type { Profile } from '../types'

export interface Session {
  me: Profile
  partner: Profile
  pairId: string
}

// Phase 1 用 mock 實作，Phase 2 換 Firebase 實作，UI 不動（見 CLAUDE.md client 架構）
export interface DataProvider {
  loadSession(): Promise<Session>
  /** 訂閱單一 checkin 文件（{dateKey}_{uid}）的存在與否 */
  subscribeCheckin(pairId: string, checkinId: string, cb: (exists: boolean) => void): () => void
  /** 悲觀更新：resolve 即代表 server 已確認；已存在視為冪等成功 */
  createCheckin(pairId: string, checkinId: string): Promise<void>
}
