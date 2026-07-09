import type { WeatherBundle } from '../types'
import { WeatherIcon } from './WeatherIcon'

function weekdayLabel(date: string, index: number): string {
  if (index === 0) return '今天'
  // date 已是當地日期字串；固定用 UTC 解析避免瀏覽器時區位移
  return new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

/** 常駐在天空上的預報：只有溫度和雨，直接顯示、不需點擊 */
export function ForecastBlock({ bundle }: { bundle: WeatherBundle }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {/* 未來 12 小時：塞滿寬度、不捲動不裁切；0% 也顯示——留白之外，數字要誠實 */}
      <div className="flex justify-between">
        {bundle.hourly.map((h, i) => (
          <div key={`${h.hour}-${i}`} className="flex flex-col items-center gap-1 text-[11px] leading-none">
            <span className="opacity-60">{i === 0 ? '現在' : `${h.hour}時`}</span>
            <WeatherIcon kind={h.kind} isDay={h.isDay} size={15} />
            <span className="text-xs">{h.temperature}°</span>
            <span className="opacity-65">{h.precipProb}%</span>
          </div>
        ))}
      </div>

      <hr className="border-white/20" />

      <ul className="flex flex-col gap-1.5">
        {bundle.daily.map((d, i) => (
          <li key={d.date} className="flex items-center gap-3 text-xs leading-none">
            <span className="w-8 opacity-80">{weekdayLabel(d.date, i)}</span>
            <WeatherIcon kind={d.kind} size={16} />
            <span className="w-9 opacity-60">{d.precipProb}%</span>
            <span className="flex-1 text-right">
              <span className="opacity-55">{d.low}°</span>
              <span className="mx-1.5 opacity-40">—</span>
              {d.high}°
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
