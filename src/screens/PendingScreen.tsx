import { useState } from 'react'
import { SettingsSheet } from '../components/SettingsSheet'
import { SkyPane } from '../components/SkyPane'
import { provider } from '../data'
import { inviteLink } from '../lib/inviteCode'
import type { Profile } from '../types'
import { useWeather } from '../weather/useWeather'

// 等待配對是短暫的過渡：邀請碼直接顯示在天空上（使用者剛按下邀請，正需要它），
// 但整組維持純文字的輕
export function PendingScreen({ me, inviteCode }: { me: Profile; inviteCode: string }) {
  const weather = useWeather(me.lat, me.lng)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <main className="relative flex h-dvh flex-col">
      <SkyPane profile={me} weather={weather} onSettingsClick={() => setShowSettings(true)}>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm text-white/70">把這串邀請碼交給那個人</p>
          <p data-testid="invite-code" className="font-mono text-xl tracking-[0.2em]">
            {inviteCode}
          </p>
          <div className="flex gap-4">
            <button
              className="py-1 text-sm text-white/70 transition-opacity hover:text-white"
              onClick={() => {
                navigator.clipboard
                  .writeText(inviteLink(inviteCode))
                  .then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                  .catch(() => {})
              }}
            >
              {copied ? '已複製' : '複製邀請連結'}
            </button>
            <button
              className="py-1 text-sm text-white/50 transition-opacity hover:text-white/80 disabled:opacity-40"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await provider.cancelInvite()
                } finally {
                  setBusy(false)
                }
              }}
            >
              取消邀請
            </button>
          </div>
        </div>
      </SkyPane>
      {showSettings && <SettingsSheet me={me} onClose={() => setShowSettings(false)} />}
    </main>
  )
}
