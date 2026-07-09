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

  // 「今天」各自以打卡者自己的時區為準：查對方的打卡用對方的 tz、
  // 查自己的用自己的 tz（見 CLAUDE.md 規則 6 與即時性節）
  const partnerCheckinId = useCheckinId(partner.tz, partner.uid)
  const myCheckinId = useCheckinId(me.tz, me.uid)

  const partnerCame = useCheckinExists(pairId, partnerCheckinId)
  const iCame = useCheckinExists(pairId, myCheckinId)

  return (
    <main className="flex h-dvh flex-col">
      <SkyPane profile={partner} weather={partnerWeather} showLocalTime />
      <SkyPane
        profile={me}
        weather={myWeather}
        visitedBy={partnerCame ? partner.nickname : null}
        visitorIsDay={partnerWeather.status === 'ok' ? partnerWeather.weather.now.isDay : true}
        onProfileClick={() => setShowSettings(true)}
      >
        <CheckinButton
          checked={iCame}
          offline={!online}
          onCheckin={() => provider.createCheckin(pairId, myCheckinId)}
        />
      </SkyPane>
      {showSettings && <SettingsSheet me={me} paired onClose={() => setShowSettings(false)} />}
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
