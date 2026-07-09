import { useState } from 'react'
import { NightBackdrop } from '../components/NightBackdrop'
import { provider } from '../data'

export function SignInScreen() {
  const [error, setError] = useState('')
  return (
    <main className="relative h-dvh overflow-hidden">
      <NightBackdrop />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-white">
        <h1 className="text-3xl font-light tracking-[0.3em]">兩片天空</h1>
        <p className="text-sm opacity-70">不聊天，但知道彼此的天空</p>
        <button
          className="rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm text-white/90 backdrop-blur transition-colors hover:bg-white/20"
          onClick={() => {
            setError('')
            provider.signIn().catch(() => setError('登入沒有完成，再試一次'))
          }}
        >
          用 Google 登入
        </button>
        {error && <p className="text-xs opacity-60">{error}</p>}
      </div>
    </main>
  )
}
