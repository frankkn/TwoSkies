import { useEffect, useState } from 'react'
import { CheckinButton } from '../components/CheckinButton'
import { SettingsSheet } from '../components/SettingsSheet'
import { SkyPane } from '../components/SkyPane'
import { provider } from '../data'
import { checkinId, dateKeyFor } from '../lib/time'
import { useOnline } from '../lib/useOnline'
import type { Profile } from '../types'
import { useWeather } from '../weather/useWeather'

interface Props {
  me: Profile
  partner: Profile
  pairId: string
}

export function PairedScreen({ me, partner, pairId }: Props) {
  const myWeather = useWeather(me.lat, me.lng)
  const partnerWeather = useWeather(partner.lat, partner.lng)
  const online = useOnline()
  const [showSettings, setShowSettings] = useState(false)
  const [confirmUnpair, setConfirmUnpair] = useState(false)
  const [busy, setBusy] = useState(false)

  // 「今天」各自以打卡者自己的時區為準：查對方的打卡用對方的 tz、
  // 查自己的用自己的 tz（見 CLAUDE.md 規則 6 與即時性節）
  const partnerCheckinId = useCheckinId(partner.tz, partner.uid)
  const myCheckinId = useCheckinId(me.tz, me.uid)

  const partnerCame = useCheckinExists(pairId, partnerCheckinId)
  const iCame = useCheckinExists(pairId, myCheckinId)

  const pairingSection = confirmUnpair ? (
    <div className="flex flex-col gap-3">
      <p className="text-sm opacity-80">解除後立刻刪除所有共享的資料，不另行通知對方。</p>
      <div className="flex gap-3">
        <button
          disabled={busy}
          className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm disabled:opacity-40"
          onClick={async () => {
            setBusy(true)
            try {
              await provider.unpair()
              setShowSettings(false)
            } finally {
              setBusy(false)
            }
          }}
        >
          確定解除
        </button>
        <button className="px-4 py-1.5 text-sm opacity-60 hover:opacity-90" onClick={() => setConfirmUnpair(false)}>
          再想想
        </button>
      </div>
    </div>
  ) : (
    <button className="self-start text-sm opacity-60 hover:opacity-90" onClick={() => setConfirmUnpair(true)}>
      解除配對
    </button>
  )

  return (
    <main className="flex h-dvh flex-col">
      <SkyPane profile={partner} weather={partnerWeather} showLocalTime />
      <SkyPane
        profile={me}
        weather={myWeather}
        visitedBy={partnerCame ? partner.nickname : null}
        onSettingsClick={() => setShowSettings(true)}
      >
        <CheckinButton
          checked={iCame}
          offline={!online}
          partnerNickname={partner.nickname}
          onCheckin={() => provider.createCheckin(pairId, myCheckinId)}
        />
      </SkyPane>
      {showSettings && (
        <SettingsSheet me={me} pairingSection={pairingSection} onClose={() => setShowSettings(false)} />
      )}
    </main>
  )
}

// dateKey 會在該時區跨日時改變；每 30 秒重算一次（值不變就不觸發 render）
function useCheckinId(tz: string, uid: string): string {
  const [dateKey, setDateKey] = useState(() => dateKeyFor(tz))
  useEffect(() => {
    setDateKey(dateKeyFor(tz))
    const timer = setInterval(() => setDateKey(dateKeyFor(tz)), 30_000)
    return () => clearInterval(timer)
  }, [tz])
  return checkinId(dateKey, uid)
}

function useCheckinExists(pairId: string, id: string): boolean {
  const [exists, setExists] = useState(false)
  useEffect(() => provider.subscribeCheckin(pairId, id, setExists), [pairId, id])
  return exists
}
