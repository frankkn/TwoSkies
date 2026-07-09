import { useState } from 'react'
import { SettingsSheet } from '../components/SettingsSheet'
import { SkyPane } from '../components/SkyPane'
import { provider } from '../data'
import { inviteLink } from '../lib/inviteCode'
import type { Profile } from '../types'
import { useWeather } from '../weather/useWeather'

const pill =
  'rounded-full border border-white/30 bg-slate-900/30 px-4 py-1.5 text-sm text-white backdrop-blur-md transition-colors hover:bg-slate-900/45 disabled:opacity-40'

export function PendingScreen({ me, inviteCode }: { me: Profile; inviteCode: string }) {
  const weather = useWeather(me.lat, me.lng)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <main className="relative flex h-dvh flex-col">
      <SkyPane profile={me} weather={weather} onProfileClick={() => setShowSettings(true)}>
        <div className="flex flex-col items-end gap-2">
          <p className="text-sm opacity-75">把這串邀請碼交給那個人</p>
          <p data-testid="invite-code" className="font-mono text-xl tracking-[0.2em]">
            {inviteCode}
          </p>
          <div className="flex gap-2">
            <button
              className={pill}
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
              className={pill}
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
      {showSettings && <SettingsSheet me={me} paired={false} onClose={() => setShowSettings(false)} />}
    </main>
  )
}
