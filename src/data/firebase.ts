import { Capacitor } from '@capacitor/core'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { coarsen } from '../lib/geocode'
import { generateInviteCode } from '../lib/inviteCode'
import { checkinId as buildCheckinId, dateKeyFor } from '../lib/time'
import type { Profile } from '../types'
import {
  InviteError,
  type AppState,
  type DataProvider,
  type InvitePreview,
  type ProfileInput,
} from './provider'

const HOUR = 3600_000
// 對方解除配對的一次性記號：lazy cleanup 清掉 pairId 後，
// 「配對已結束」畫面只剩這個本地記號能撐起來（見 CLAUDE.md）。
// 以 uid 命名空間——同一瀏覽器換帳號登入不能看到別人的結束畫面
const PAIR_ENDED_PREFIX = 'twoskies.pairEnded.'

interface RawUser extends DocumentData {
  pairId?: string | null
  nickname: string
  city: string
  lat: number
  lng: number
  tz: string
}

function toProfile(uid: string, data: RawUser): Profile {
  return { uid, nickname: data.nickname, city: data.city, lat: data.lat, lng: data.lng, tz: data.tz }
}

export class FirebaseProvider implements DataProvider {
  private state: AppState = { phase: 'loading' }
  private listeners = new Set<(s: AppState) => void>()
  private uid: string | null = null
  private me: Profile | null = null
  private currentPairId: string | null = null
  /** 自己主動解除/取消時，pair 消失不算「被結束」 */
  private selfInitiated = false

  private unsubUser?: () => void
  private unsubPair?: () => void
  private unsubPartner?: () => void

  constructor() {
    onAuthStateChanged(auth, user => this.onAuth(user))
  }

  // --- 訂閱鏈：auth → 自己 users → pair → 對方 users，上游變化下游統一 teardown ---

  private teardownPartner() {
    this.unsubPartner?.()
    this.unsubPartner = undefined
  }

  private teardownPair() {
    this.unsubPair?.()
    this.unsubPair = undefined
    this.teardownPartner()
  }

  private teardownUser() {
    this.unsubUser?.()
    this.unsubUser = undefined
    this.teardownPair()
  }

  private emit(state: AppState) {
    this.state = state
    this.listeners.forEach(cb => cb(state))
  }

  private onAuth(user: User | null) {
    this.teardownUser()
    this.me = null
    this.currentPairId = null
    if (!user) {
      this.uid = null
      this.emit({ phase: 'unauthenticated' })
      return
    }
    this.uid = user.uid
    this.emit({ phase: 'loading' })
    this.unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      snap => {
        this.onUserDoc(snap.exists() ? (snap.data() as RawUser) : null)
      },
      err => console.warn('[twoskies] user listener error:', err.code, err.message),
    )
  }

  private onUserDoc(data: RawUser | null) {
    this.teardownPair()
    const uid = this.uid
    if (!uid) return
    if (!data) {
      this.emit({ phase: 'onboarding' })
      return
    }
    const me = toProfile(uid, data)
    this.me = me
    this.currentPairId = data.pairId ?? null
    if (!this.currentPairId) {
      if (this.selfInitiated) {
        this.selfInitiated = false
        this.emit({ phase: 'solo', me })
      } else if (localStorage.getItem(PAIR_ENDED_PREFIX + uid)) {
        this.emit({ phase: 'pair-ended', me })
      } else {
        this.emit({ phase: 'solo', me })
      }
      return
    }
    const pairId = this.currentPairId
    this.unsubPair = onSnapshot(
      doc(db, 'pairs', pairId),
      snap => {
        // 離線且快取沒有這份文件時，listener 會發出 fromCache 的「不存在」——
        // 那不是解除訊號，誤信會排入 pairId=null 的破壞性寫入。只信 server 的刪除事件
        if (!snap.exists() && snap.metadata.fromCache) return
        this.onPairDoc(pairId, snap.exists() ? snap.data() : null)
      },
      err => console.warn('[twoskies] pair listener error:', err.code, err.message),
    )
  }

  private onPairDoc(pairId: string, data: DocumentData | null) {
    this.teardownPartner()
    const me = this.me
    const uid = this.uid
    if (!me || !uid) return

    if (!data) {
      // pair 消失＝解除訊號：立即退訂（上面已 teardown）、lazy cleanup 自己的 pairId。
      // users onSnapshot 會接手轉到 pair-ended（對方解除）或 solo（自己解除）
      if (!this.selfInitiated) localStorage.setItem(PAIR_ENDED_PREFIX + uid, '1')
      void updateDoc(doc(db, 'users', uid), { pairId: null }).catch(() => {})
      return
    }

    const members = data.members as string[]
    if (members.length === 1) {
      this.emit({ phase: 'pending', me, pairId, inviteCode: data.inviteCode as string })
      return
    }

    const partnerUid = members.find(m => m !== uid)
    if (!partnerUid) {
      this.emit({ phase: 'solo', me }) // 防禦：異常資料
      return
    }
    this.unsubPartner = onSnapshot(
      doc(db, 'users', partnerUid),
      snap => {
        if (!snap.exists()) return
        this.emit({ phase: 'paired', me, partner: toProfile(partnerUid, snap.data() as RawUser), pairId })
      },
      err => {
        // 撤權中的暫時性 permission error：pair 的 snapshot 會接手收拾
        console.warn('[twoskies] partner listener error:', err.code, err.message)
      },
    )
  }

  subscribeAppState(cb: (s: AppState) => void) {
    this.listeners.add(cb)
    cb(this.state)
    return () => {
      this.listeners.delete(cb)
    }
  }

  // --- 動作 ---

  async signIn() {
    // Android 殼的 WebView 被 Google 封鎖 OAuth popup：改走原生 Google Sign-In，
    // 拿 idToken 讓 JS SDK 登入——之後的訂閱鏈與資料層跟網頁版走同一條路
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      const result = await FirebaseAuthentication.signInWithGoogle()
      const idToken = result.credential?.idToken
      if (!idToken) throw new Error('native google sign-in returned no idToken')
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
      return
    }
    // signInWithRedirect 在 Safari/儲存分區下靜默失敗，一律 popup（見 CLAUDE.md）
    await signInWithPopup(auth, new GoogleAuthProvider())
  }

  async signOut() {
    // 原生層也要登出，下次登入才會重新出現帳號選擇
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      await FirebaseAuthentication.signOut()
    }
    await firebaseSignOut(auth)
  }

  async saveProfile(input: ProfileInput) {
    const uid = this.requireUid()
    // merge 且不碰 pairId：全量覆寫會把快照裡可能過時的 currentPairId 寫回去，
    // 與進行中的配對寫入 race；pairId 只由配對流程與 lazy cleanup 動
    await setDoc(
      doc(db, 'users', uid),
      {
        nickname: input.nickname,
        city: input.city,
        lat: coarsen(input.lat),
        lng: coarsen(input.lng),
        tz: input.tz,
      },
      { merge: true },
    )
  }

  async createInvite() {
    const uid = this.requireUid()
    const me = this.me
    if (!me) throw new Error('profile not ready')
    const code = generateInviteCode()
    const pairRef = doc(collection(db, 'pairs'))
    const batch = writeBatch(db)
    batch.set(pairRef, { members: [uid], inviteCode: code, createdAt: serverTimestamp() })
    batch.set(doc(db, 'invites', code), {
      pairId: pairRef.id,
      createdBy: uid,
      inviterNickname: me.nickname,
      // rules 上限是 request.time + 24h；用 20h 留時鐘偏差餘裕
      expiresAt: Timestamp.fromMillis(Date.now() + 20 * HOUR),
    })
    batch.update(doc(db, 'users', uid), { pairId: pairRef.id })
    await batch.commit()
  }

  async cancelInvite() {
    const uid = this.requireUid()
    const s = this.state
    if (s.phase !== 'pending') return
    this.selfInitiated = true
    const batch = writeBatch(db)
    batch.delete(doc(db, 'invites', s.inviteCode))
    batch.delete(doc(db, 'pairs', s.pairId))
    batch.update(doc(db, 'users', uid), { pairId: null })
    try {
      await batch.commit()
    } catch (e) {
      // 取消沒成立（例如對方恰好同時兌換成功）——旗標必須復位，
      // 否則之後對方真的解除時會誤入 solo 而非「配對已結束」
      this.selfInitiated = false
      throw e
    }
  }

  async previewInvite(code: string): Promise<InvitePreview | null> {
    const snap = await getDoc(doc(db, 'invites', code))
    if (!snap.exists()) return null
    const data = snap.data()
    if ((data.expiresAt as Timestamp).toMillis() <= Date.now()) return null
    return { inviterNickname: data.inviterNickname as string }
  }

  async redeemInvite(code: string) {
    const uid = this.requireUid()
    try {
      await runTransaction(db, async tx => {
        const inv = await tx.get(doc(db, 'invites', code))
        if (!inv.exists()) throw new InviteError()
        const { pairId, createdBy, expiresAt } = inv.data() as {
          pairId: string
          createdBy: string
          expiresAt: Timestamp
        }
        if (expiresAt.toMillis() <= Date.now()) throw new InviteError()
        tx.update(doc(db, 'pairs', pairId), { members: [createdBy, uid] })
        tx.delete(doc(db, 'invites', code))
        tx.update(doc(db, 'users', uid), { pairId })
      })
    } catch (e) {
      if (e instanceof InviteError) throw e
      // 網路類錯誤照實往上丟（UI 顯示「暫時連不上」）——
      // 誤映射成「已被使用或已過期」會讓人把還有效的碼丟掉
      const code = (e as { code?: string }).code
      if (code === 'unavailable' || code === 'deadline-exceeded') throw e
      // rules 拒絕（已用/搶先/自兌換）統一映射
      throw new InviteError()
    }
  }

  async unpair() {
    const s = this.state
    if (s.phase !== 'paired') return
    this.selfInitiated = true
    // 關鍵動作：刪 pair，單筆原子，即刻生效
    try {
      await deleteDoc(doc(db, 'pairs', s.pairId))
    } catch (e) {
      this.selfInitiated = false // 解除沒成立，旗標復位（同 cancelInvite）
      throw e
    }
    // 後續清理：孤兒 checkins 的 ID 可確定性算出（前天/昨天/今天 × 兩人 tz × 兩人 uid）——
    // checkin 最長活 48h＋TTL 延遲，前天的可能還在；中途斷線由 TTL 兜底
    try {
      const batch = writeBatch(db)
      const dateKeys = new Set<string>()
      for (const offset of [0, 86_400_000, 172_800_000]) {
        const d = new Date(Date.now() - offset)
        dateKeys.add(dateKeyFor(s.me.tz, d))
        dateKeys.add(dateKeyFor(s.partner.tz, d))
      }
      for (const key of dateKeys) {
        for (const uid of [s.me.uid, s.partner.uid]) {
          batch.delete(doc(db, 'pairs', s.pairId, 'checkins', buildCheckinId(key, uid)))
        }
      }
      batch.update(doc(db, 'users', s.me.uid), { pairId: null })
      await batch.commit()
    } catch {
      // TTL 是最終兜底；殘留由顯示層 dateKey 過濾，永不被看見
    }
  }

  async acknowledgePairEnded() {
    if (this.uid) localStorage.removeItem(PAIR_ENDED_PREFIX + this.uid)
    if (this.me) this.emit({ phase: 'solo', me: this.me })
  }

  subscribeCheckin(pairId: string, checkinId: string, cb: (exists: boolean) => void) {
    return onSnapshot(
      doc(db, 'pairs', pairId, 'checkins', checkinId),
      snap => cb(snap.exists()),
      () => {
        // 解除配對過程的撤權 error：當作不存在即可
      },
    )
  }

  async createCheckin(pairId: string, checkinId: string) {
    const ref = doc(db, 'pairs', pairId, 'checkins', checkinId)
    try {
      await setDoc(ref, {
        at: serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + 48 * HOUR),
      })
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'already-exists') return
      // permission-denied 可能是「已存在（另一分頁先打了）→ rules 拒絕 update」的冪等成功，
      // 也可能是時鐘偏差超出 rules 的 expireAt 窗或 App Check 失敗——
      // 查證文件真的存在才算成功，否則往上丟，不讓打卡靜默失敗
      if (code === 'permission-denied') {
        const exists = await getDoc(ref).then(s => s.exists()).catch(() => false)
        if (exists) return
      }
      throw e
    }
  }

  private requireUid(): string {
    if (!this.uid) throw new Error('not signed in')
    return this.uid
  }
}
