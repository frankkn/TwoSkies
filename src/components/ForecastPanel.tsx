import type { WeatherBundle, WeatherKind } from '../types'

const KIND_LABEL: Record<WeatherKind, string> = {
  clear: '晴',
  cloudy: '雲',
  rain: '雨',
  snow: '雪',
}

function weekdayLabel(date: string, index: number): string {
  if (index === 0) return '今天'
  // date 已是當地日期字串；固定用 UTC 解析避免瀏覽器時區位移
  return new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

/** 輕點天空展開的安靜預報：只有溫度和雨，再點收回 */
export function ForecastPanel({ bundle, onClose }: { bundle: WeatherBundle; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-md sm:p-8"
      onClick={e => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 text-white">
        <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">
          {bundle.hourly.map((h, i) => (
            <div key={`${h.hour}-${i}`} className="flex shrink-0 flex-col items-center gap-1">
              <span className="text-xs opacity-60">{i === 0 ? '現在' : `${h.hour}時`}</span>
              <span className="text-sm">{h.temperature}°</span>
              <span className="text-xs opacity-70">{h.precipProb > 0 ? `${h.precipProb}%` : '·'}</span>
            </div>
          ))}
        </div>

        <hr className="border-white/15" />

        <ul className="flex flex-col gap-2">
          {bundle.daily.map((d, i) => (
            <li key={d.date} className="flex items-center gap-3 text-sm">
              <span className="w-10 opacity-80">{weekdayLabel(d.date, i)}</span>
              <span className="w-6 opacity-70">{KIND_LABEL[d.kind]}</span>
              <span className="w-12 text-xs opacity-60">{d.precipProb > 0 ? `${d.precipProb}%` : ''}</span>
              <span className="flex-1 text-right">
                <span className="opacity-55">{d.low}°</span>
                <span className="mx-1.5 opacity-40">—</span>
                {d.high}°
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
