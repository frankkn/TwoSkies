import type { ReactNode } from 'react'
import type { Profile, WeatherStatus } from '../types'
import { useNow } from '../lib/time'
import { getMoonPhase } from '../weather/moonPhase'
import { ForecastBlock } from './ForecastPanel'
import { SkyScene } from './SkyScene'

interface Props {
  profile: Profile
  weather: WeatherStatus
  /** 對方那片天空顯示當地時間 */
  showLocalTime?: boolean
  /** 名字/城市下方的儀式行：對方那片＝打卡按鈕、自己那片＝來訪標記；沒有就留白 */
  ritual?: ReactNode
  /** 有值就在稱呼右側顯示齒輪設定入口 */
  onSettingsClick?: () => void
  /** 預報密度：全螢幕單片＝cozy（預設）、兩片同框＝compact */
  forecastDensity?: 'cozy' | 'compact'
  /**
   * 這片天空貼著螢幕的哪些邊：貼邊處的留白要加上系統列的 safe-area inset，
   * 否則 edge-to-edge 下打卡膠囊/邀請碼動作會沉到 Android 導覽列後面。
   * 配對畫面上片傳 'top'、下片傳 'bottom'；單人全螢幕用預設 'both'
   */
  safeArea?: 'top' | 'bottom' | 'both'
  children?: ReactNode
}

export function SkyPane({ profile, weather, showLocalTime, ritual, onSettingsClick, forecastDensity, safeArea = 'both', children }: Props) {
  const now = useNow(profile.tz)
  const bundle = weather.status === 'ok' ? weather.weather : null
  const safeTop = safeArea !== 'bottom'
  const safeBottom = safeArea !== 'top'

  return (
    <section className="relative flex-1 overflow-hidden">
      <SkyScene sky={bundle?.now ?? null} moonPhase={getMoonPhase()} error={weather.status === 'error'} />
      <div
        className={`absolute inset-0 flex flex-col px-5 text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] sm:px-8 ${
          safeTop
            ? 'pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:pt-[calc(2rem+env(safe-area-inset-top,0px))]'
            : 'pt-5 sm:pt-8'
        } ${
          safeBottom
            ? 'pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'
            : 'pb-5 sm:pb-8'
        }`}
      >
        <header className="flex items-start justify-between">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-medium">{profile.nickname}</h2>
                {onSettingsClick && (
                  <button
                    type="button"
                    aria-label="設定"
                    className="shrink-0 p-1 text-white/55 transition-colors hover:text-white"
                    onClick={onSettingsClick}
                  >
                    <GearIcon />
                  </button>
                )}
              </div>
              <p className="text-sm opacity-75">
                {profile.city}
                {showLocalTime && ` · ${now}`}
              </p>
            </div>
            {ritual}
          </div>
          {/* h-0 讓溫度欄不貢獻 header 高度——卡片位置只由左欄文字流決定，
              卡片的磨砂玻璃可滑到溫度文字底下（文字碰撞由卡片端的 padding 防守）；
              relative z-10 讓溫度文字浮在玻璃上、而不是被玻璃磨糊 */}
          <div className="relative z-10 h-0 shrink-0 overflow-visible">
            <div className="flex flex-col items-center">
              {/* 隱形 ° 當左側配重：置中以數字為視覺中心，度符號不把數字擠偏 */}
              <p className="text-5xl font-extralight sm:text-6xl">
                {bundle ? <><span className="invisible">°</span>{bundle.now.temperature}°</> : '–'}
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
          </div>
        </header>

        {/* 預報緊貼資訊區下方；七天列吃滿剩餘高度（放得下就全展開） */}
        {bundle ? (
          <div className="mt-1 min-h-0 flex-1 overflow-hidden">
            <ForecastBlock bundle={bundle} lat={profile.lat} lng={profile.lng} density={forecastDensity} />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* footer 只留給 pending 的邀請碼區；打卡/來訪標記已上移到名字下方（ritual） */}
        {children && <footer className="mt-3 flex shrink-0 items-end justify-end gap-4">{children}</footer>}
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
