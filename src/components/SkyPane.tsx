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
          <p className="text-4xl font-extralight">{bundle ? `${bundle.now.temperature}°` : '–'}</p>
        </header>

        <div className="flex-1" />

        {bundle && <ForecastBlock bundle={bundle} />}

        <footer className="mt-3 flex items-end justify-between gap-4">
          {visitedBy ? (
            <p className="text-sm text-white/60">{visitedBy}來看過你的天空了</p>
          ) : (
            <span />
          )}
          {children}
        </footer>
      </div>
    </section>
  )
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
