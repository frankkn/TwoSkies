import { useEffect, useState, type ReactNode } from 'react'
import type { Profile, WeatherStatus } from '../types'
import { localTimeIn } from '../lib/time'
import { ForecastBlock } from './ForecastPanel'
import { SkyScene } from './SkyScene'

interface Props {
  profile: Profile
  weather: WeatherStatus
  /** 對方那片天空顯示當地時間 */
  showLocalTime?: boolean
  /** 對方今天來看過：淺淺一句話；null 就什麼都沒有——留白是誠實 */
  visitedBy?: string | null
  /** 有值就在左上資訊區下方顯示齒輪設定入口 */
  onSettingsClick?: () => void
  children?: ReactNode
}

export function SkyPane({ profile, weather, showLocalTime, visitedBy, onSettingsClick, children }: Props) {
  const now = useNow(profile.tz)
  const bundle = weather.status === 'ok' ? weather.weather : null

  return (
    <section className="relative flex-1 overflow-hidden">
      <SkyScene sky={bundle?.now ?? null} error={weather.status === 'error'} />
      <div className="absolute inset-0 flex flex-col p-5 text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="flex items-start justify-between">
          <div className="flex flex-col items-start gap-1">
            <div>
              <h2 className="text-lg font-medium">{profile.nickname}</h2>
              <p className="text-sm opacity-75">
                {profile.city}
                {showLocalTime && ` · ${now}`}
              </p>
            </div>
            {onSettingsClick && (
              <button
                type="button"
                aria-label="設定"
                className="-ml-1 mt-1 p-1 text-white/55 transition-colors hover:text-white"
                onClick={onSettingsClick}
              >
                <GearIcon />
              </button>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <p className="text-5xl font-extralight sm:text-6xl">
              {bundle ? `${bundle.now.temperature}°` : '–'}
            </p>
            {bundle && (
              <div className="mt-1 flex flex-col items-center">
                <p className="text-sm opacity-75">
                  最高{bundle.today.high}° 最低{bundle.today.low}°
                </p>
                <p className="text-sm opacity-75">{conditionLabel(bundle.now)}</p>
              </div>
            )}
          </div>
        </header>

        {/* 預報緊貼資訊區下方；七天列吃滿剩餘高度（放得下就全展開） */}
        {bundle ? (
          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <ForecastBlock bundle={bundle} lat={profile.lat} lng={profile.lng} />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <footer className="mt-3 flex shrink-0 items-end justify-between gap-4">
          {visitedBy ? (
            <p className="rounded-full bg-slate-900/25 px-4 py-2 text-sm text-white/70 backdrop-blur-md">
              {visitedBy}來看過你的天空了
            </p>
          ) : (
            <span />
          )}
          {children}
        </footer>
      </div>
    </section>
  )
}

function conditionLabel(now: { kind: string; isDay: boolean }): string {
  if (now.kind === 'clear') return now.isDay ? '晴天' : '晴朗'
  if (now.kind === 'cloudy') return '多雲'
  if (now.kind === 'rain') return '有雨'
  return '降雪'
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.12-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.12 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" />
    </svg>
  )
}

function useNow(tz: string): string {
  const [now, setNow] = useState(() => localTimeIn(tz))
  useEffect(() => {
    setNow(localTimeIn(tz))
    const timer = setInterval(() => setNow(localTimeIn(tz)), 30_000)
    return () => clearInterval(timer)
  }, [tz])
  return now
}
