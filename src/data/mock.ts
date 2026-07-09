import type { Profile } from '../types'
import { checkinId, dateKeyFor } from '../lib/time'
import type { AppState, DataProvider, InvitePreview, ProfileInput } from './provider'

// Phase 1 假資料：開場即已配對。僅供本地開發 UI 用（VITE_USE_MOCK=1）。
const PARTNER: Profile = {
  uid: 'uid-partner',
  nickname: '阿寶',
  city: '倫敦',
  lat: 51.5,
  lng: -0.1,
  tz: 'Europe/London',
}
const PAIR_ID = 'mock-pair'
const STORE_KEY = 'twoskies.mock.checkins'

let me: Profile = { uid: 'uid-me', nickname: '小雨', city: '台北', lat: 25.0, lng: 121.5, tz: 'Asia/Taipei' }
let state: AppState = { phase: 'loading' }
const stateListeners = new Set<(s: AppState) => void>()

function emit(next: AppState) {
  state = next
  stateListeners.forEach(fn => fn(next))
}

function readStore(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function writeStore(ids: Set<string>) {
  localStorage.setItem(STORE_KEY, JSON.stringify([...ids]))
}

const checkinListeners = new Set<() => void>()
function notifyCheckins() {
  checkinListeners.forEach(fn => fn())
}

// 另一個分頁改了 localStorage 時同步（打卡狀態以訂閱為準，不以本地旗標為準）
window.addEventListener('storage', e => {
  if (e.key === STORE_KEY) notifyCheckins()
})

function boot() {
  // 假資料：讓對方今天已經來看過，來訪標記才看得到
  const ids = readStore()
  ids.add(checkinId(dateKeyFor(PARTNER.tz), PARTNER.uid))
  writeStore(ids)
  emit({ phase: 'paired', me, partner: PARTNER, pairId: PAIR_ID })
}

export const mockProvider: DataProvider = {
  subscribeAppState(cb) {
    stateListeners.add(cb)
    if (state.phase === 'loading') boot()
    else cb(state)
    return () => {
      stateListeners.delete(cb)
    }
  },

  async signIn() {},
  async signOut() {},

  async saveProfile(input: ProfileInput) {
    me = { ...me, ...input }
    if (state.phase === 'paired') emit({ phase: 'paired', me, partner: PARTNER, pairId: PAIR_ID })
  },

  async createInvite() {},
  async cancelInvite() {},

  async previewInvite(): Promise<InvitePreview | null> {
    return { inviterNickname: PARTNER.nickname }
  },

  async redeemInvite() {},

  async unpair() {
    emit({ phase: 'solo', me })
  },

  async acknowledgePairEnded() {
    emit({ phase: 'solo', me })
  },

  subscribeCheckin(_pairId, id, cb) {
    const emitCheckin = () => cb(readStore().has(id))
    emitCheckin()
    checkinListeners.add(emitCheckin)
    return () => {
      checkinListeners.delete(emitCheckin)
    }
  },

  async createCheckin(_pairId, id) {
    const ids = readStore()
    if (!ids.has(id)) {
      // 已打過視為冪等成功；不論如何都 notify，訂閱者才會翻轉狀態
      ids.add(id)
      writeStore(ids)
    }
    notifyCheckins()
  },
}
