import type { Profile } from '../types'

// 根狀態機：所有畫面由此態導出，禁止元件自行判斷（見 CLAUDE.md client 架構）
export type AppState =
  | { phase: 'loading' }
  | { phase: 'unauthenticated' }
  | { phase: 'onboarding' }
  | { phase: 'solo'; me: Profile }
  | { phase: 'pending'; me: Profile; pairId: string; inviteCode: string }
  | { phase: 'paired'; me: Profile; partner: Profile; pairId: string }
  | { phase: 'pair-ended'; me: Profile }

export interface ProfileInput {
  nickname: string
  city: string
  lat: number
  lng: number
  tz: string
}

export interface InvitePreview {
  inviterNickname: string
}

/** 兌換失敗（已用/過期/不存在）的統一錯誤 */
export class InviteError extends Error {
  constructor() {
    super('這個邀請碼已被使用或已過期')
    this.name = 'InviteError'
  }
}

// Phase 1 mock 實作、Phase 2 Firebase 實作，UI 不動
export interface DataProvider {
  subscribeAppState(cb: (state: AppState) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** 建立或更新自己的 users 文件；座標由實作粗化到 0.1° */
  saveProfile(input: ProfileInput): Promise<void>
  /** solo → pending：同一 batch 建 pair + invite + 綁自己的 pairId */
  createInvite(): Promise<void>
  /** pending → solo：同一 batch 刪 invite + pair + 清 pairId */
  cancelInvite(): Promise<void>
  /** 兌換前顯示「{inviterNickname} 邀請你」；不存在/過期回 null */
  previewInvite(code: string): Promise<InvitePreview | null>
  /** solo → paired：runTransaction（update pair + 刪 invite + 綁 pairId）；失敗丟 InviteError */
  redeemInvite(code: string): Promise<void>
  /** paired → solo：先刪 pair（單筆原子），再清孤兒 checkins 與自己的 pairId */
  unpair(): Promise<void>
  /** pair-ended → solo：使用者看過「配對已結束」後呼叫 */
  acknowledgePairEnded(): Promise<void>
  /** 訂閱單一 checkin 文件（{dateKey}_{uid}）的存在與否 */
  subscribeCheckin(pairId: string, checkinId: string, cb: (exists: boolean) => void): () => void
  /** 悲觀更新：resolve 即代表 server 已確認；已存在視為冪等成功 */
  createCheckin(pairId: string, checkinId: string): Promise<void>
}
