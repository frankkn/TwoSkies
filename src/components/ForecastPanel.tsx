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

/** 逐時橫列：格數由外層依可用寬度算好傳入（每格約 64px），按住拖曳看全部，
 *  右緣內容淡出提示可捲 */
const HOUR_COL_PX = 64

function HourStrip({ hours, cols, nowLabel }: { hours: HourPoint[]; cols: number; nowLabel?: boolean }) {
  const ref = useDragScroll('x')

  return (
    <div
      ref={ref}
      className="flex shrink-0 cursor-grab snap-x select-none overflow-x-auto pb-0.5 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_left,transparent,black_2.5rem)]"
    >
      {hours.map((h, i) => (
        <div
          key={`${h.hour}-${i}`}
          className="flex shrink-0 snap-start flex-col items-center gap-1.5 text-xs leading-none"
          style={{ flexBasis: `${100 / cols}%` }}
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
  const blockRef = useRef<HTMLDivElement>(null)
  const dailyRef = useDragScroll('y')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dayHours, setDayHours] = useState<Record<string, HourPoint[] | 'loading'>>({})
  const [cols, setCols] = useState(6)
  const [colPx, setColPx] = useState(HOUR_COL_PX)
  const [listOverflows, setListOverflows] = useState(false)

  // 區塊寬度 → 動態格數與欄寬（逐時列與七天列首尾格共用同一把尺）
  useEffect(() => {
    const el = blockRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      const next = Math.max(4, Math.floor(el.clientWidth / HOUR_COL_PX))
      setCols(next)
      setColPx(el.clientWidth / next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 底緣淡出遮罩只在七天列真的有捲動空間時出現
  useEffect(() => {
    const el = dailyRef.current
    if (!el) return
    const check = () => setListOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [dailyRef, expanded, dayHours])

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

  // 溫度範圍條的「週尺」：整週最低～最高溫，七行共用同一把尺才能直向比較
  const weekMin = Math.min(...bundle.daily.map(d => d.low))
  const weekMax = Math.max(...bundle.daily.map(d => d.high))
  const weekRange = Math.max(1, weekMax - weekMin)
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - weekMin) / weekRange) * 100))

  return (
    <div ref={blockRef} className="flex h-full min-h-0 w-full max-w-[40rem] flex-col gap-3">
      <HourStrip hours={bundle.hourly} cols={cols} nowLabel />

      <hr className="shrink-0 border-white/20" />

      {/* 七天列：吃滿可用高度，放得下就全展開；放不下往下拖曳看（可捲時底緣淡出）。
          極矮視窗至少保底兩行 */}
      <ul
        ref={dailyRef}
        className={`flex min-h-14 flex-1 cursor-grab select-none flex-col gap-1.5 overflow-y-auto active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          listOverflows ? '[mask-image:linear-gradient(to_top,transparent,black_1.5rem)]' : ''
        }`}
      >
        {bundle.daily.map((d, i) => {
          const detail = dayHours[d.date]
          const left = pos(d.low)
          const width = Math.max(4, pos(d.high) - left)
          return (
            <li key={d.date}>
              {/* iPhone 式：星期｜圖示｜雨%｜低溫｜溫度範圍條｜高溫，佔滿區塊寬度 */}
              <button
                type="button"
                className="flex w-full items-center gap-3 text-sm leading-none"
                onClick={e => {
                  void toggleDay(d.date)
                  const row = e.currentTarget
                  setTimeout(() => row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80)
                }}
              >
                {/* 首尾格採逐時欄寬置中：「今天」對齊上方「現在」、最高溫對齊最右欄的溫度 */}
                <span style={{ width: colPx }} className="shrink-0 text-center opacity-80">
                  {weekdayLabel(d.date, i)}
                </span>
                <WeatherIcon kind={d.kind} size={17} />
                <span className="w-9 text-center text-xs opacity-60">{d.precipProb}%</span>
                <span className="w-7 text-right opacity-55">{d.low}°</span>
                <span className="relative h-1 min-w-8 flex-1 rounded-full bg-white/25">
                  {/* 亮色片段＝這天的低～高溫落在週尺上的位置；片段裁切一條
                      橫跨整週尺的冷暖漸層，冷端偏青、熱端偏橘 */}
                  <span
                    className="absolute inset-y-0 overflow-hidden rounded-full"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span
                      className="block h-full bg-linear-to-r from-cyan-300 via-amber-200 to-orange-400"
                      style={{ width: `${10000 / width}%`, marginLeft: `-${(left / width) * 100}%` }}
                    />
                  </span>
                  {/* 今天那行：現在溫度的小白點 */}
                  {i === 0 && (
                    <span
                      className="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(15,23,42,0.4)]"
                      style={{ left: `${pos(bundle.now.temperature)}%` }}
                    />
                  )}
                </span>
                <span style={{ width: colPx }} className="shrink-0 text-center">
                  {d.high}°
                </span>
              </button>
              {expanded === d.date && (
                <div className="mt-1.5 mb-1">
                  {detail === 'loading' || !detail ? (
                    <p className="py-2 text-xs opacity-50">…</p>
                  ) : (
                    <HourStrip hours={detail} cols={cols} />
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
