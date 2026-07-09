import { useEffect, useState } from 'react'
import { CheckinButton } from '../components/CheckinButton'
import { HorizonStrip } from '../components/HorizonStrip'
import { SettingsSheet } from '../components/SettingsSheet'
import { SkyPane } from '../components/SkyPane'
import { provider } from '../data'
import { checkinId, dateKeyFor } from '../lib/time'
import { useOnline } from '../lib/useOnline'
import { readViewMode, writeViewMode, type ViewMode } from '../lib/viewMode'
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode())
  const [focused, setFocused] = useState<'partner' | 'me'>('partner')

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    writeViewMode(mode)
    // 每次「進入」focus 模式都回到對方——打開這個模式的第一眼永遠是對方的天空
    if (mode === 'focus') setFocused('partner')
  }

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

  // 打卡語意歸位：「我來看過你的天空了」發生在看對方天空時——放對方那片的名字下方
  const checkin = (
    <CheckinButton
      checked={iCame}
      offline={!online}
      partnerNickname={partner.nickname}
      onCheckin={() => provider.createCheckin(pairId, myCheckinId)}
    />
  )
  const visitedBy = partnerCame ? partner.nickname : null
  // 來訪標記在自己那片的名字下方；沒來就什麼都沒有——留白是誠實
  const visitedMark = visitedBy ? (
    <p className="rounded-full bg-slate-900/25 px-4 py-1.5 text-sm text-white/70 backdrop-blur-md">
      {visitedBy}來看過你的天空了
    </p>
  ) : undefined

  // 檢視模式是裝置偏好（localStorage），收在設定裡；當前值亮一點
  const viewModeSection = (
    <div className="flex flex-col gap-3">
      <p className="text-sm opacity-75">檢視模式</p>
      <div className="flex gap-4">
        <button
          className={`text-sm ${viewMode === 'split' ? 'opacity-90' : 'opacity-50 hover:opacity-80'}`}
          onClick={() => changeViewMode('split')}
        >
          兩片同框
        </button>
        <button
          className={`text-sm ${viewMode === 'focus' ? 'opacity-90' : 'opacity-50 hover:opacity-80'}`}
          onClick={() => changeViewMode('focus')}
        >
          一片大天空
        </button>
      </div>
    </div>
  )

  return (
    <main className="flex h-dvh flex-col">
      {viewMode === 'split' ? (
        <>
          {/* 同框＝半屏高度：預報用緊湊密度，滿版寬鬆留給 focus/solo 的全螢幕單片。
              齒輪掛上片（對方）的名字旁——同框時整個畫面的「右上角」在對方那片 */}
          <SkyPane
            profile={partner}
            weather={partnerWeather}
            showLocalTime
            safeArea="top"
            ritual={checkin}
            onSettingsClick={() => setShowSettings(true)}
            forecastDensity="compact"
          />
          <SkyPane
            profile={me}
            weather={myWeather}
            ritual={visitedMark}
            safeArea="bottom"
            forecastDensity="compact"
          />
        </>
      ) : focused === 'partner' ? (
        <>
          {/* key 必加：同型別 SkyPane 互換會被 React 重用實例，
              ForecastBlock 的手風琴快取只以日期為 key——倫敦的逐時會畫進台北的手風琴 */}
          <SkyPane
            key={partner.uid}
            profile={partner}
            weather={partnerWeather}
            showLocalTime
            safeArea="top"
            ritual={checkin}
            onSettingsClick={() => setShowSettings(true)}
          />
          <HorizonStrip
            position="bottom"
            profile={me}
            weather={myWeather}
            visitedBy={visitedBy}
            onTap={() => setFocused('me')}
          />
        </>
      ) : (
        <>
          <HorizonStrip
            position="top"
            profile={partner}
            weather={partnerWeather}
            showLocalTime
            onTap={() => setFocused('partner')}
          />
          <SkyPane
            key={me.uid}
            profile={me}
            weather={myWeather}
            ritual={visitedMark}
            safeArea="bottom"
            onSettingsClick={() => setShowSettings(true)}
          />
        </>
      )}
      {showSettings && (
        <SettingsSheet
          me={me}
          viewModeSection={viewModeSection}
          pairingSection={pairingSection}
          onClose={() => setShowSettings(false)}
        />
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
