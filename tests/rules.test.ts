import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

const ALICE = 'alice'
const BOB = 'bob'
const EVE = 'eve'
const PAIR = 'pair-1'
const CODE = 'code-abcd1234'
const HOUR = 3600_000

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-twoskies',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

function db(uid?: string): Firestore {
  const ctx = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()
  return ctx.firestore() as unknown as Firestore
}

const profile = (over: Record<string, unknown> = {}) => ({
  pairId: null,
  nickname: '小雨',
  city: '台北',
  lat: 25.0,
  lng: 121.5,
  tz: 'Asia/Taipei',
  ...over,
})

const todayKey = () => new Date().toISOString().slice(0, 10)
const checkinData = () => ({
  at: serverTimestamp(),
  expireAt: Timestamp.fromMillis(Date.now() + 48 * HOUR),
})

async function seed(fn: (f: Firestore) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await fn(ctx.firestore() as unknown as Firestore)
  })
}

/** alice 與 bob 已配對 */
async function seedPaired() {
  await seed(async f => {
    await setDoc(doc(f, 'users', ALICE), profile({ pairId: PAIR }))
    await setDoc(
      doc(f, 'users', BOB),
      profile({ nickname: '阿寶', city: '倫敦', lat: 51.5, lng: -0.1, tz: 'Europe/London', pairId: PAIR }),
    )
    await setDoc(doc(f, 'pairs', PAIR), { members: [ALICE, BOB], inviteCode: CODE, createdAt: Timestamp.now() })
  })
}

/** alice 已建立邀請（pending），bob 尚未兌換 */
async function seedPending(expiresInMs = HOUR, bobOver: Record<string, unknown> = {}) {
  await seed(async f => {
    await setDoc(doc(f, 'users', ALICE), profile({ pairId: PAIR }))
    await setDoc(doc(f, 'users', BOB), profile({ nickname: '阿寶', ...bobOver }))
    await setDoc(doc(f, 'users', EVE), profile({ nickname: '小偷' }))
    await setDoc(doc(f, 'pairs', PAIR), { members: [ALICE], inviteCode: CODE, createdAt: Timestamp.now() })
    await setDoc(doc(f, 'invites', CODE), {
      pairId: PAIR,
      createdBy: ALICE,
      inviterNickname: '小雨',
      expiresAt: Timestamp.fromMillis(Date.now() + expiresInMs),
    })
  })
}

/** 標準兌換 transaction：update pair + 刪 invite + 綁自己的 pairId。
 *  invite 已消失時仍硬寫（模擬知道 pairId 的惡意 client）——rules 必須照樣拒絕 */
function redeem(as: string) {
  const f = db(as)
  return runTransaction(f, async tx => {
    const inv = await tx.get(doc(f, 'invites', CODE))
    const data = inv.data() as { pairId: string; createdBy: string } | undefined
    const pairId = data?.pairId ?? PAIR
    const createdBy = data?.createdBy ?? ALICE
    tx.update(doc(f, 'pairs', pairId), { members: [createdBy, as] })
    tx.delete(doc(f, 'invites', CODE))
    tx.update(doc(f, 'users', as), { pairId })
  })
}

/** 標準建立邀請 batch：pair + invite + 綁自己的 pairId */
function createInviteBatch(as: string, inviteOver: Record<string, unknown> = {}, skipUserBind = false) {
  const f = db(as)
  const b = writeBatch(f)
  b.set(doc(f, 'pairs', PAIR), { members: [as], inviteCode: CODE, createdAt: serverTimestamp() })
  b.set(doc(f, 'invites', CODE), {
    pairId: PAIR,
    createdBy: as,
    inviterNickname: '小雨',
    expiresAt: Timestamp.fromMillis(Date.now() + 20 * HOUR),
    ...inviteOver,
  })
  if (!skipUserBind) b.update(doc(f, 'users', as), { pairId: PAIR })
  return b.commit()
}

describe('users 文件', () => {
  it('非本人不可改（位置/稱呼只有本人能改）', async () => {
    await seedPaired()
    await assertFails(updateDoc(doc(db(EVE), 'users', ALICE), { nickname: '駭客' }))
    await assertFails(updateDoc(doc(db(BOB), 'users', ALICE), { city: '巴黎' }))
    await assertSucceeds(updateDoc(doc(db(ALICE), 'users', ALICE), { nickname: '雨雨' }))
  })

  it('本人可建立 users 文件（onboarding）', async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE), profile()))
  })

  it('夾帶白名單外欄位拒絕（不聊天是基礎設施承諾）', async () => {
    await seedPaired()
    await assertFails(updateDoc(doc(db(ALICE), 'users', ALICE), { message: '今晚老地方見' }))
    await assertFails(setDoc(doc(db(EVE), 'users', EVE), { ...profile(), note: 'x' }))
  })

  it('未粗化座標（非 0.1 倍數）拒絕', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'users', ALICE), profile({ lat: 25.033 })))
    await assertFails(setDoc(doc(db(ALICE), 'users', ALICE), profile({ lng: 121.5654 })))
    await assertSucceeds(setDoc(doc(db(ALICE), 'users', ALICE), profile({ lat: 25.1, lng: 121.6 })))
  })

  it('nickname 超過 20 字拒絕', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'users', ALICE), profile({ nickname: '很'.repeat(21) })))
  })

  it('配對成員可讀對方；外人與未登入不可', async () => {
    await seedPaired()
    await assertSucceeds(getDoc(doc(db(BOB), 'users', ALICE)))
    await assertFails(getDoc(doc(db(EVE), 'users', ALICE)))
    await assertFails(getDoc(doc(db(), 'users', ALICE)))
  })

  it('users 文件禁止 delete', async () => {
    await seedPaired()
    await assertFails(deleteDoc(doc(db(ALICE), 'users', ALICE)))
  })

  it('禁止 list users', async () => {
    await seedPaired()
    await assertFails(getDocs(collection(db(ALICE), 'users')))
  })
})

describe('users.pairId 指標防護（一人一配對不可繞過）', () => {
  it('配對存續期間本人不能自清 pairId（清了就能建第二個配對）', async () => {
    await seedPaired()
    await assertFails(updateDoc(doc(db(ALICE), 'users', ALICE), { pairId: null }))
  })

  it('pair 已刪除後本人可清 pairId（lazy cleanup / unpair 的後續清理）', async () => {
    await seedPaired()
    await seed(async f => {
      await deleteDoc(doc(f, 'pairs', PAIR))
    })
    await assertSucceeds(updateDoc(doc(db(ALICE), 'users', ALICE), { pairId: null }))
  })

  it('不能把 pairId 指到自己不在其中的 pair', async () => {
    await seedPaired()
    await seed(async f => {
      await setDoc(doc(f, 'users', EVE), profile({ nickname: '小偷' }))
    })
    await assertFails(updateDoc(doc(db(EVE), 'users', EVE), { pairId: PAIR }))
  })

  it('不能把 pairId 指到不存在的 pair', async () => {
    await seed(async f => {
      await setDoc(doc(f, 'users', ALICE), profile())
    })
    await assertFails(updateDoc(doc(db(ALICE), 'users', ALICE), { pairId: 'ghost-pair' }))
  })
})

describe('建立配對與邀請碼', () => {
  beforeEach(async () => {
    await seed(async f => {
      await setDoc(doc(f, 'users', ALICE), profile())
    })
  })

  it('正常建立：pair + invite + 綁自己的 pairId 同一 batch → 放行', async () => {
    await assertSucceeds(createInviteBatch(ALICE))
  })

  it('沒有同 batch 綁 users.pairId → 拒絕（一人一配對由 rules 強制）', async () => {
    await assertFails(createInviteBatch(ALICE, {}, true))
  })

  it('已在配對中的人不能再建 pair', async () => {
    await seed(async f => {
      await updateDoc(doc(f, 'users', ALICE), { pairId: 'other-pair' })
    })
    await assertFails(createInviteBatch(ALICE))
  })

  it('invite expiresAt 超過 24h 上限 → 拒絕（TTL 不可被繞過）', async () => {
    await assertFails(
      createInviteBatch(ALICE, { expiresAt: Timestamp.fromMillis(Date.now() + 25 * HOUR) }),
    )
  })

  it('禁止 list invites（防枚舉）', async () => {
    await seedPending()
    await assertFails(getDocs(collection(db(EVE), 'invites')))
  })

  it('外人不能刪 invite；建立者可刪（取消邀請）', async () => {
    await seedPending()
    await assertFails(deleteDoc(doc(db(EVE), 'invites', CODE)))
    const f = db(ALICE)
    const b = writeBatch(f)
    b.delete(doc(f, 'invites', CODE))
    b.delete(doc(f, 'pairs', PAIR))
    b.update(doc(f, 'users', ALICE), { pairId: null })
    await assertSucceeds(b.commit())
  })
})

describe('兌換邀請碼', () => {
  it('正常兌換 transaction → 放行', async () => {
    await seedPending()
    await assertSucceeds(redeem(BOB))
  })

  it('非交易性兌換（未同時刪 invite）→ 拒絕', async () => {
    await seedPending()
    const f = db(BOB)
    const b = writeBatch(f)
    b.update(doc(f, 'pairs', PAIR), { members: [ALICE, BOB] })
    b.update(doc(f, 'users', BOB), { pairId: PAIR })
    await assertFails(b.commit())
  })

  it('過期邀請碼拒絕兌換', async () => {
    await seedPending(-1000)
    await assertFails(redeem(BOB))
  })

  it('自兌換 [A, A] 拒絕', async () => {
    await seedPending()
    await assertFails(redeem(ALICE))
  })

  it('已用邀請碼不能再兌換', async () => {
    await seedPending()
    await assertSucceeds(redeem(BOB))
    await assertFails(redeem(EVE))
  })

  it('已在別的配對裡的人不能兌換', async () => {
    await seedPending(HOUR, { pairId: 'other-pair' })
    await assertFails(redeem(BOB))
  })

  it('配對滿員後換掉成員 → 拒絕', async () => {
    await seedPaired()
    await assertFails(updateDoc(doc(db(ALICE), 'pairs', PAIR), { members: [ALICE, EVE] }))
  })
})

describe('checkins', () => {
  const myCheckin = (uid: string) => `${todayKey()}_${uid}`

  it('成員打卡 → 放行；非成員讀取拒絕', async () => {
    await seedPaired()
    const ref = doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE))
    await assertSucceeds(setDoc(ref, checkinData()))
    await assertSucceeds(getDoc(doc(db(BOB), 'pairs', PAIR, 'checkins', myCheckin(ALICE))))
    await assertFails(getDoc(doc(db(EVE), 'pairs', PAIR, 'checkins', myCheckin(ALICE))))
  })

  it('一天一次：ID 重複拒絕', async () => {
    await seedPaired()
    await assertSucceeds(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), checkinData()))
    await assertFails(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), checkinData()))
  })

  it('不能替對方打卡（ID 的 uid 必須是自己）', async () => {
    await seedPaired()
    await assertFails(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(BOB)), checkinData()))
  })

  it('dateKey 偏離現在超過 48h → 拒絕（不補打卡）', async () => {
    await seedPaired()
    await assertFails(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', `2020-01-01_${ALICE}`), checkinData()))
  })

  it('at 必須是 serverTimestamp、expireAt 必須 ≈ +48h', async () => {
    await seedPaired()
    await assertFails(
      setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), {
        at: Timestamp.fromMillis(Date.now() - 10 * HOUR),
        expireAt: Timestamp.fromMillis(Date.now() + 38 * HOUR),
      }),
    )
    await assertFails(
      setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), {
        at: serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + 72 * HOUR),
      }),
    )
  })

  it('夾帶白名單外欄位拒絕', async () => {
    await seedPaired()
    await assertFails(
      setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), {
        ...checkinData(),
        message: '想你',
      }),
    )
  })

  it('不可 update checkin', async () => {
    await seedPaired()
    await assertSucceeds(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), checkinData()))
    await assertFails(
      updateDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), {
        expireAt: Timestamp.fromMillis(Date.now() + 48 * HOUR),
      }),
    )
  })

  it('pair 存續期間刪 checkin 拒絕（點了收不回）；pair 刪除後放行（孤兒清理）', async () => {
    await seedPaired()
    const id = myCheckin(ALICE)
    await assertSucceeds(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', id), checkinData()))
    await assertFails(deleteDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', id)))
    await assertFails(deleteDoc(doc(db(BOB), 'pairs', PAIR, 'checkins', id)))
    await assertSucceeds(deleteDoc(doc(db(BOB), 'pairs', PAIR)))
    await assertSucceeds(deleteDoc(doc(db(BOB), 'pairs', PAIR, 'checkins', id)))
  })

  it('配對未滿員（pending）時不能打卡', async () => {
    await seedPending()
    await assertFails(setDoc(doc(db(ALICE), 'pairs', PAIR, 'checkins', myCheckin(ALICE)), checkinData()))
  })

  it('禁止 list checkins', async () => {
    await seedPaired()
    await assertFails(getDocs(collection(db(ALICE), 'pairs', PAIR, 'checkins')))
  })
})

describe('解除配對', () => {
  it('非成員不能刪 pair；成員解除配對放行', async () => {
    await seedPaired()
    await assertFails(deleteDoc(doc(db(EVE), 'pairs', PAIR)))
    await assertSucceeds(deleteDoc(doc(db(BOB), 'pairs', PAIR)))
  })

  it('非成員不能讀 pair', async () => {
    await seedPaired()
    await assertFails(getDoc(doc(db(EVE), 'pairs', PAIR)))
    await assertSucceeds(getDoc(doc(db(ALICE), 'pairs', PAIR)))
  })
})
