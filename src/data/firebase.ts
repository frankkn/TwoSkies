import {
  GoogleAuthProvider,
  onAuthStateChanged,
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
// 「配對已結束」畫面只剩這個本地記號能撐起來（見 CLAUDE.md）
const PAIR_ENDED_KEY = 'twoskies.pairEnded'

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
      } else if (localStorage.getItem(PAIR_ENDED_KEY)) {
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
      if (!this.selfInitiated) localStorage.setItem(PAIR_ENDED_KEY, '1')
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
    // signInWithRedirect 在 Safari/儲存分區下靜默失敗，一律 popup（見 CLAUDE.md）
    await signInWithPopup(auth, new GoogleAuthProvider())
  }

  async signOut() {
    await firebaseSignOut(auth)
  }

  async saveProfile(input: ProfileInput) {
    const uid = this.requireUid()
    await setDoc(doc(db, 'users', uid), {
      nickname: input.nickname,
      city: input.city,
      lat: coarsen(input.lat),
      lng: coarsen(input.lng),
      tz: input.tz,
      pairId: this.currentPairId,
    })
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
    await batch.commit()
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
      // rules 拒絕（已用/搶先/自兌換）統一映射
      throw new InviteError()
    }
  }

  async unpair() {
    const s = this.state
    if (s.phase !== 'paired') return
    this.selfInitiated = true
    // 關鍵動作：刪 pair，單筆原子，即刻生效
    await deleteDoc(doc(db, 'pairs', s.pairId))
    // 後續清理：孤兒 checkins 的 ID 可確定性算出（昨天/今天 × 兩人 tz × 兩人 uid）；
    // 中途斷線由 TTL 兜底
    try {
      const batch = writeBatch(db)
      const dateKeys = new Set<string>()
      for (const offset of [0, 86_400_000]) {
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
    localStorage.removeItem(PAIR_ENDED_KEY)
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
    try {
      await setDoc(doc(db, 'pairs', pairId, 'checkins', checkinId), {
        at: serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + 48 * HOUR),
      })
    } catch (e) {
      // 已存在（另一分頁先打了）→ rules 拒絕 update → 冪等成功；狀態以訂閱為準
      const code = (e as { code?: string }).code
      if (code === 'permission-denied' || code === 'already-exists') return
      throw e
    }
  }

  private requireUid(): string {
    if (!this.uid) throw new Error('not signed in')
    return this.uid
  }
}
