import type { Profile, WeatherStatus } from '../types'
import { useNow } from '../lib/time'
import { SkyScene } from './SkyScene'

interface Props {
  profile: Profile
  weather: WeatherStatus
  /** 對方的條顯示當地時間 */
  showLocalTime?: boolean
  /** 對方今天來看過（值＝對方稱呼）：條上一句短版「{稱呼}來看過你」 */
  visitedBy?: string | null
  /** 條貼著螢幕的哪條邊——safe-area inset 墊在按鈕內，整條都是點擊目標 */
  position: 'top' | 'bottom'
  onTap: () => void
}

// focus 模式下被收合那片天空的「地平線」：一道薄條，天空還在，只是退到天邊。
// 點整條互換焦點——不是 UI 按鈕，是把那片天空拉回來
export function HorizonStrip({ profile, weather, showLocalTime, visitedBy, position, onTap }: Props) {
  const now = useNow(profile.tz)
  const bundle = weather.status === 'ok' ? weather.weather : null
  const sky = bundle?.now ?? null

  return (
    <button
      type="button"
      aria-label={`切換到${profile.nickname}的天空`}
      onClick={onTap}
      className={`relative w-full shrink-0 overflow-hidden text-left ${
        position === 'bottom'
          ? 'pb-[env(safe-area-inset-bottom,0px)]'
          : 'pt-[env(safe-area-inset-top,0px)]'
      }`}
    >
      {/* 天空本體延伸到系統列後面；不傳 error——56px 高不渲染占位文字，昏雲底就夠誠實 */}
      <SkyScene sky={sky} />
      {/* 淡 scrim：晴日/雪日的亮底上白字才讀得清 */}
      <div className="absolute inset-0 bg-slate-900/15" />

      {/* h-20：條要夠高，SkyScene 的月亮/太陽才不會被攔腰裁切 */}
      <div className="relative flex h-20 items-center gap-3 px-5 text-sm text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] sm:px-8">
        <span aria-hidden className="shrink-0">
          {sky ? (sky.isDay ? '☀️' : '🌙') : '☁️'}
        </span>
        {/* 截斷優先序：稱呼·城市先讓（暱稱≤20、城市≤50 字，480px 下溢出是常態不是邊角） */}
        <span className="min-w-0 flex-1 truncate">
          {profile.nickname}·{profile.city}
          {showLocalTime && <span className="opacity-75"> · {now}</span>}
        </span>
        {visitedBy && (
          <span className="max-w-36 shrink-0 truncate text-xs text-white/70">
            {visitedBy}來看過你
          </span>
        )}
        <span className="shrink-0 text-lg font-light">
          {bundle ? `${bundle.now.temperature}°` : '–'}
        </span>
        <span aria-hidden className="shrink-0 text-xs opacity-60">
          {position === 'bottom' ? '▴' : '▾'}
        </span>
      </div>
    </button>
  )
}
