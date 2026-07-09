import { useEffect, useState } from 'react'
import type { Session } from './data/provider'
import { mockProvider } from './data/mock'
import { checkinId, dateKeyFor } from './lib/time'
import { useWeather } from './weather/useWeather'
import { SkyPane } from './components/SkyPane'
import { CheckinButton } from './components/CheckinButton'

// Phase 1：mock provider（假配對、假資料）；Phase 2 換 Firebase 實作
const provider = mockProvider

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  useEffect(() => {
    provider.loadSession().then(setSession)
  }, [])

  if (!session) return <div className="h-dvh bg-slate-900" />
  return <PairedScreen session={session} />
}

function PairedScreen({ session }: { session: Session }) {
  const { me, partner, pairId } = session
  const myWeather = useWeather(me.lat, me.lng)
  const partnerWeather = useWeather(partner.lat, partner.lng)

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
        visitorIsDay={partnerWeather.status === 'ok' ? partnerWeather.weather.isDay : true}
      >
        <CheckinButton
          checked={iCame}
          onCheckin={() => provider.createCheckin(pairId, myCheckinId)}
        />
      </SkyPane>
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
