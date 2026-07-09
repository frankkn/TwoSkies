import type { DataProvider } from './provider'
import { mockProvider } from './mock'
import { FirebaseProvider } from './firebase'

// VITE_USE_MOCK=1 或沒有任何 Firebase 設定 → 假資料模式（Phase 1 原型行為）
const hasFirebase =
  Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID) || import.meta.env.VITE_USE_EMULATORS === '1'

export const provider: DataProvider =
  import.meta.env.VITE_USE_MOCK === '1' || !hasFirebase ? mockProvider : new FirebaseProvider()
