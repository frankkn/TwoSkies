import { useEffect, useRef, useState } from 'react'
import type { HourPoint, WeatherBundle } from '../types'
import { fetchDayHourly } from '../weather/openMeteo'
import { WeatherIcon } from './WeatherIcon'

/** 滑鼠按住拖曳捲動（觸控裝置交給原生手勢）；拖過的那一下不觸發 click */
function useDragScroll(axis: 'x' | 'y') {
  const ref = useRef<HTMLDivElement & HTMLUListElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let pressed = false
    let dragging = false
    let moved = false
    let start = 0
    let startScroll = 0

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      e.stopPropagation() // 巢狀拖曳區（日展開的逐時列在七天列裡）內層優先
      pressed = true
      dragging = false
      moved = false
      start = axis === 'x' ? e.clientX : e.clientY
      startScroll = axis === 'x' ? el.scrollLeft : el.scrollTop
      // 注意：這裡不能立刻 setPointerCapture——capture 會把 click 改派給容器，
      // 行按鈕就永遠點不到；拖過閾值才開始 capture
    }
    const move = (e: PointerEvent) => {
      if (!pressed) return
      const delta = (axis === 'x' ? e.clientX : e.clientY) - start
      if (!dragging && Math.abs(delta) > 5) {
        dragging = true
        moved = true
        el.setPointerCapture(e.pointerId)
      }
      if (!dragging) return
      if (axis === 'x') el.scrollLeft = startScroll - delta
      else el.scrollTop = startScroll - delta
    }
    const up = (e: PointerEvent) => {
      pressed = false
      dragging = false
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('click', click, true)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('click', click, true)
    }
  }, [axis])
  return ref
}

function weekdayLabel(date: string, index: number): string {
  if (index === 0) return '今天'
  // date 已是當地日期字串；固定用 UTC 解析避免瀏覽器時區位移
  return new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

/** 逐時橫列：6 格可見、按住拖曳看全部，右緣內容淡出提示可捲 */
function HourStrip({ hours, nowLabel }: { hours: HourPoint[]; nowLabel?: boolean }) {
  const ref = useDragScroll('x')
  return (
    <div
      ref={ref}
      className="flex cursor-grab snap-x select-none overflow-x-auto pb-0.5 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_left,transparent,black_2.5rem)]"
    >
      {hours.map((h, i) => (
        <div
          key={`${h.hour}-${i}`}
          className="flex shrink-0 basis-1/6 snap-start flex-col items-center gap-1.5 text-xs leading-none"
        >
          <span className="opacity-60">{nowLabel && i === 0 ? '現在' : `${h.hour}時`}</span>
          <WeatherIcon kind={h.kind} isDay={h.isDay} size={18} />
          <span className="text-sm">{h.temperature}°</span>
          <span className="text-[11px] opacity-65">{h.precipProb}%</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  bundle: WeatherBundle
  lat: number
  lng: number
}

/** 常駐在天空上的預報：只有溫度和雨，直接顯示、不需點擊。
 *  區塊限寬靠左——寬螢幕不撐滿，右半邊留給天空 */
export function ForecastBlock({ bundle, lat, lng }: Props) {
  const dailyRef = useDragScroll('y')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dayHours, setDayHours] = useState<Record<string, HourPoint[] | 'loading'>>({})

  async function toggleDay(date: string) {
    if (expanded === date) {
      setExpanded(null)
      return
    }
    setExpanded(date)
    if (dayHours[date]) return
    setDayHours(s => ({ ...s, [date]: 'loading' }))
    try {
      const hours = await fetchDayHourly(lat, lng, date)
      setDayHours(s => ({ ...s, [date]: hours }))
    } catch {
      // 抓不到就安靜收回，不報錯嚇人
      setDayHours(s => {
        const next = { ...s }
        delete next[date]
        return next
      })
      setExpanded(current => (current === date ? null : current))
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <HourStrip hours={bundle.hourly} nowLabel />

      <hr className="border-white/20" />

      {/* 七天列：可視高度約 4 行，其餘往下拖曳看；底緣內容淡出提示 */}
      <ul
        ref={dailyRef}
        className={`flex cursor-grab select-none flex-col gap-1.5 overflow-y-auto active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_top,transparent,black_1.5rem)] ${
          expanded ? 'max-h-48' : 'max-h-24'
        }`}
      >
        {bundle.daily.map((d, i) => {
          const detail = dayHours[d.date]
          return (
            <li key={d.date}>
              {/* 欄位緊鄰：星期・圖示・雨%・低—高溫，不留中間空白 */}
              <button
                type="button"
                className="flex items-center gap-3 text-sm leading-none"
                onClick={e => {
                  void toggleDay(d.date)
                  const row = e.currentTarget
                  setTimeout(() => row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80)
                }}
              >
                <span className="w-9 text-left opacity-80">{weekdayLabel(d.date, i)}</span>
                <WeatherIcon kind={d.kind} size={17} />
                <span className="w-10 text-left text-xs opacity-60">{d.precipProb}%</span>
                <span>
                  <span className="opacity-55">{d.low}°</span>
                  <span className="mx-1 opacity-40">—</span>
                  {d.high}°
                </span>
              </button>
              {expanded === d.date && (
                <div className="mt-1.5 mb-1">
                  {detail === 'loading' || !detail ? (
                    <p className="py-2 text-xs opacity-50">…</p>
                  ) : (
                    <HourStrip hours={detail} />
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
