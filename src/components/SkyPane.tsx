import { useEffect, useState, type ReactNode } from 'react'
import type { Profile, WeatherStatus } from '../types'
import { localTimeIn } from '../lib/time'
import { SkyScene } from './SkyScene'

interface Props {
  profile: Profile
  weather: WeatherStatus
  /** 對方那片天空顯示當地時間 */
  showLocalTime?: boolean
  /** 對方今天來看過：顯示溫柔的標記；null 就什麼都沒有——留白是誠實 */
  visitedBy?: string | null
  visitorIsDay?: boolean
  children?: ReactNode
}

export function SkyPane({ profile, weather, showLocalTime, visitedBy, visitorIsDay, children }: Props) {
  const now = useNow(profile.tz)
  return (
    <section className="relative flex-1 overflow-hidden">
      <SkyScene weather={weather} />
      <div className="absolute inset-0 flex flex-col justify-between p-5 text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.3)] sm:p-8">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium">{profile.nickname}</h2>
            <p className="text-sm opacity-75">
              {profile.city}
              {showLocalTime && ` · ${now}`}
            </p>
          </div>
          <p className="text-4xl font-extralight">
            {weather.status === 'ok' ? `${weather.weather.temperature}°` : '–'}
          </p>
        </header>
        <footer className="flex items-end justify-between gap-4">
          {visitedBy ? (
            <p className="flex items-center gap-2 text-sm opacity-90">
              <span aria-hidden>{visitorIsDay ? '☀️' : '🌙'}</span>
              {visitedBy}今天來看過你
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

function useNow(tz: string): string {
  const [now, setNow] = useState(() => localTimeIn(tz))
  useEffect(() => {
    setNow(localTimeIn(tz))
    const timer = setInterval(() => setNow(localTimeIn(tz)), 30_000)
    return () => clearInterval(timer)
  }, [tz])
  return now
}
