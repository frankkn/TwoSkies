import type { WeatherBundle } from '../types'
import { WeatherIcon } from './WeatherIcon'

function weekdayLabel(date: string, index: number): string {
  if (index === 0) return '今天'
  // date 已是當地日期字串；固定用 UTC 解析避免瀏覽器時區位移
  return new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

/** 常駐在天空上的預報：只有溫度和雨，直接顯示、不需點擊。
 *  區塊限寬靠左——寬螢幕不撐滿，右半邊留給天空 */
export function ForecastBlock({ bundle }: { bundle: WeatherBundle }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {/* 未來 24 小時：畫面固定 6 格，其餘橫向捲動（右緣漸淡提示）；0% 也顯示 */}
      {/* 右緣內容淡出提示可捲——用 mask 透出天空，亮暗底都好看 */}
      <div className="flex snap-x overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_left,transparent,black_2.5rem)]">
        {bundle.hourly.map((h, i) => (
          <div
            key={`${h.hour}-${i}`}
            className="flex shrink-0 basis-1/6 snap-start flex-col items-center gap-1.5 text-xs leading-none"
          >
            <span className="opacity-60">{i === 0 ? '現在' : `${h.hour}時`}</span>
            <WeatherIcon kind={h.kind} isDay={h.isDay} size={18} />
            <span className="text-sm">{h.temperature}°</span>
            <span className="text-[11px] opacity-65">{h.precipProb}%</span>
          </div>
        ))}
      </div>

      <hr className="border-white/20" />

      <ul className="flex flex-col gap-1.5">
        {bundle.daily.map((d, i) => (
          <li key={d.date} className="flex items-center gap-3 text-sm leading-none">
            <span className="w-9 opacity-80">{weekdayLabel(d.date, i)}</span>
            <WeatherIcon kind={d.kind} size={17} />
            <span className="w-10 text-xs opacity-60">{d.precipProb}%</span>
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
