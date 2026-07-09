import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // rules 測試共用一個 emulator 專案，序列執行避免 clearFirestore 互踩
    fileParallelism: false,
  },
})
