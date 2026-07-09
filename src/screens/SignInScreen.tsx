import { useState } from 'react'
import { NightBackdrop } from '../components/NightBackdrop'
import { provider } from '../data'
import { isInAppBrowser } from '../lib/inAppBrowser'

export function SignInScreen() {
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const inApp = isInAppBrowser()
  return (
    <main className="relative h-dvh overflow-hidden">
      <NightBackdrop />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-white">
        <h1 className="text-3xl font-light tracking-[0.3em]">兩片天空</h1>
        <p className="text-sm opacity-70">不聊天，但知道彼此的天空</p>
        {inApp ? (
          <>
            {/* Google 擋 app 內嵌瀏覽器的 OAuth（403 disallowed_useragent）——
                與其讓人撞紅色錯誤頁，不如安靜給一條出路。複製 href 保住 #invite 片段 */}
            <p className="max-w-72 text-center text-sm leading-relaxed opacity-70">
              這是 app 內建的瀏覽器，Google 不允許在這裡登入
            </p>
            <button
              className="rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm text-white/90 backdrop-blur transition-colors hover:bg-white/20"
              onClick={() =>
                navigator.clipboard
                  .writeText(location.href)
                  .then(() => setCopied(true))
                  .catch(() => {})
              }
            >
              {copied ? '已複製，貼進瀏覽器開啟' : '複製網址，用瀏覽器開啟'}
            </button>
          </>
        ) : (
          <button
            className="rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm text-white/90 backdrop-blur transition-colors hover:bg-white/20"
            onClick={() => {
              setError('')
              provider.signIn().catch(() => setError('登入沒有完成，再試一次'))
            }}
          >
            用 Google 登入
          </button>
        )}
        {error && <p className="text-xs opacity-60">{error}</p>}
      </div>
    </main>
  )
}
