import { useEffect, useState } from 'react'
import { SettingsSheet } from '../components/SettingsSheet'
import { SkyPane } from '../components/SkyPane'
import { provider } from '../data'
import { InviteError } from '../data/provider'
import { inviteCodeFromHash } from '../lib/inviteCode'
import type { Profile } from '../types'
import { useWeather } from '../weather/useWeather'

const pill =
  'rounded-full border border-white/30 bg-slate-900/30 px-4 py-1.5 text-sm text-white backdrop-blur-md transition-colors hover:bg-slate-900/45 disabled:opacity-40'

export function SoloScreen({ me }: { me: Profile }) {
  const weather = useWeather(me.lat, me.lng)
  const [showSettings, setShowSettings] = useState(false)
  const [entering, setEntering] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linkInvite, setLinkInvite] = useState<{ code: string; nickname: string } | null>(null)

  // 邀請連結（#invite=code）：先讓 B 看到「誰邀請你」再決定
  useEffect(() => {
    const fromHash = inviteCodeFromHash(location.hash)
    if (!fromHash) return
    provider.previewInvite(fromHash).then(preview => {
      if (preview) {
        setLinkInvite({ code: fromHash, nickname: preview.inviterNickname })
      } else {
        setError('這個邀請碼已被使用或已過期')
        history.replaceState(null, '', location.pathname)
      }
    })
  }, [])

  async function redeem(target: string) {
    setBusy(true)
    setError('')
    try {
      await provider.redeemInvite(target)
      history.replaceState(null, '', location.pathname)
    } catch (e) {
      setError(e instanceof InviteError ? e.message : '暫時連不上，再試一次')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative flex h-dvh flex-col">
      <SkyPane profile={me} weather={weather} onProfileClick={() => setShowSettings(true)}>
        <div className="flex flex-col items-end gap-2">
          {error && <p className="text-xs opacity-70">{error}</p>}
          {entering ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="w-40 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm text-white placeholder-white/40 outline-none focus:border-white/50"
                placeholder="輸入邀請碼"
                value={code}
                onChange={e => setCode(e.target.value.trim().toLowerCase())}
              />
              <button className={pill} disabled={busy || code.length < 8} onClick={() => redeem(code)}>
                加入
              </button>
              <button
                className="text-xs opacity-60 hover:opacity-90"
                onClick={() => {
                  setEntering(false)
                  setError('')
                }}
              >
                算了
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className={pill} disabled={busy} onClick={() => provider.createInvite().catch(() => setError('暫時連不上，再試一次'))}>
                邀請一個人
              </button>
              <button className={pill} onClick={() => setEntering(true)}>
                輸入邀請碼
              </button>
            </div>
          )}
        </div>
      </SkyPane>

      {linkInvite && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl bg-slate-900/95 p-6 text-white">
            <p className="text-base">{linkInvite.nickname} 邀請你共享天空</p>
            <div className="flex gap-3">
              <button className={pill} disabled={busy} onClick={() => redeem(linkInvite.code)}>
                接受
              </button>
              <button
                className="px-4 py-1.5 text-sm opacity-60 hover:opacity-90"
                onClick={() => {
                  setLinkInvite(null)
                  history.replaceState(null, '', location.pathname)
                }}
              >
                先不要
              </button>
            </div>
            {error && <p className="text-xs opacity-70">{error}</p>}
          </div>
        </div>
      )}

      {showSettings && <SettingsSheet me={me} paired={false} onClose={() => setShowSettings(false)} />}
    </main>
  )
}
