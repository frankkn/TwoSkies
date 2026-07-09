import type { DataProvider, Session } from './provider'
import { checkinId, dateKeyFor } from '../lib/time'

const ME = { uid: 'uid-me', nickname: '小雨', city: '台北', lat: 25.0, lng: 121.5, tz: 'Asia/Taipei' }
const PARTNER = { uid: 'uid-partner', nickname: '阿寶', city: '倫敦', lat: 51.5, lng: -0.1, tz: 'Europe/London' }
const PAIR_ID = 'mock-pair'
const STORE_KEY = 'twoskies.mock.checkins'

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

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach(fn => fn())
}

// 另一個分頁改了 localStorage 時同步（打卡狀態以訂閱為準，不以本地旗標為準）
window.addEventListener('storage', e => {
  if (e.key === STORE_KEY) notify()
})

export const mockProvider: DataProvider = {
  async loadSession(): Promise<Session> {
    // 假資料：讓對方今天已經來看過，來訪標記才看得到
    const ids = readStore()
    ids.add(checkinId(dateKeyFor(PARTNER.tz), PARTNER.uid))
    writeStore(ids)
    return { me: ME, partner: PARTNER, pairId: PAIR_ID }
  },

  subscribeCheckin(_pairId, id, cb) {
    const emit = () => cb(readStore().has(id))
    emit()
    listeners.add(emit)
    return () => {
      listeners.delete(emit)
    }
  },

  async createCheckin(_pairId, id) {
    const ids = readStore()
    if (!ids.has(id)) {
      // 已打過視為冪等成功；不論如何都 notify，訂閱者才會翻轉狀態
      ids.add(id)
      writeStore(ids)
    }
    notify()
  },
}
