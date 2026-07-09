import { describe, expect, it } from 'vitest'
import { nudgeFor } from '../src/weather/nudge'
import type { HourPoint, WeatherBundle, WeatherKind } from '../src/types'

// 造一份平凡的 bundle:晴、乾、無風——預設什麼叮嚀都不該出現
function bundle(overrides?: {
  nowKind?: WeatherKind
  startHour?: number
  probs?: number[]
  gusts?: (number | undefined)[]
  hourKinds?: WeatherKind[]
  todayHigh?: number
  tomorrowHigh?: number
  todayProb?: number
  tomorrowProb?: number
}): WeatherBundle {
  const startHour = overrides?.startHour ?? 9
  const hourly: HourPoint[] = Array.from({ length: 24 }, (_, i) => ({
    hour: (startHour + i) % 24,
    kind: overrides?.hourKinds?.[i] ?? 'clear',
    isDay: true,
    temperature: 25,
    precipProb: overrides?.probs?.[i] ?? 0,
    gust: overrides?.gusts?.[i],
  }))
  const day = (date: string, high: number, precipProb: number) => ({
    date,
    kind: 'clear' as WeatherKind,
    high,
    low: 20,
    precipProb,
  })
  return {
    now: { kind: overrides?.nowKind ?? 'clear', temperature: 25, isDay: true },
    today: { high: 30, low: 20, precipProb: overrides?.todayProb ?? 0 },
    hourly,
    daily: [
      day('2026-07-10', overrides?.todayHigh ?? 30, overrides?.todayProb ?? 0),
      day('2026-07-11', overrides?.tomorrowHigh ?? 30, overrides?.tomorrowProb ?? 0),
    ],
  }
}

describe('nudgeFor', () => {
  it('平凡日什麼都不說', () => {
    expect(nudgeFor(bundle())).toEqual([])
  })

  it('降雨開始:60 是門檻,59 靜默', () => {
    const probs = Array(24).fill(0)
    probs[4] = 59
    expect(nudgeFor(bundle({ probs }))).toEqual([])
    probs[4] = 60
    // startHour 9,index 4 → 13 時
    expect(nudgeFor(bundle({ probs }))).toEqual(['預計大約13時開始下雨'])
  })

  it('跨午夜以「明天」開口', () => {
    const probs = Array(24).fill(0)
    probs[5] = 80 // startHour 22 → index 5 = 3 時(已跨日)
    expect(nudgeFor(bundle({ startHour: 22, probs }))).toEqual(['預計明天大約3時開始下雨'])
  })

  it('觸發小時是雪就說下雪', () => {
    const probs = Array(24).fill(0)
    probs[3] = 70
    const hourKinds = Array<WeatherKind>(24).fill('clear')
    hourKinds[3] = 'snow'
    expect(nudgeFor(bundle({ probs, hourKinds }))).toEqual(['預計大約12時開始下雪'])
  })

  it('證據守門:毛毛雨 code + 全低機率,不捏造停雨時間', () => {
    // now 是 rain 但模型機率全 0——沒證據就閉嘴
    expect(nudgeFor(bundle({ nowKind: 'rain' }))).toEqual([])
  })

  it('有證據的停雨:報出轉乾的那個小時', () => {
    const probs = [70, 65, 40, 25, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    // index 3(=12 時)起連兩小時 <30,且 index 1..2 有 ≥30 的證據
    expect(nudgeFor(bundle({ nowKind: 'rain', probs }))).toEqual(['雨大約12時會停'])
  })

  it('明天溫差 ±4 邊界與「且有雨」', () => {
    expect(nudgeFor(bundle({ todayHigh: 30, tomorrowHigh: 26, tomorrowProb: 70 }))).toEqual([
      '預計明天氣溫下降且有雨',
    ])
    expect(nudgeFor(bundle({ todayHigh: 30, tomorrowHigh: 34 }))).toEqual(['預計明天氣溫回升'])
    // 差 3 度不說話
    expect(nudgeFor(bundle({ todayHigh: 30, tomorrowHigh: 33 }))).toEqual([])
  })

  it('無溫差但明天明顯有雨:獨立一句', () => {
    expect(nudgeFor(bundle({ todayProb: 10, tomorrowProb: 75 }))).toEqual(['預計明天有雨'])
  })

  it('規則 1 已說明天下雨時,規則 3 的雨句閉嘴;上限兩句', () => {
    const probs = Array(24).fill(0)
    probs[5] = 80 // startHour 22 → 明天 3 時開始下雨
    const gusts = Array(24).fill(60)
    const result = nudgeFor(
      bundle({ startHour: 22, probs, gusts, todayProb: 10, tomorrowProb: 90 }),
    )
    expect(result).toEqual(['預計明天大約3時開始下雨', '陣風風速可達60公里/小時'])
    expect(result.join('。')).not.toContain('預計明天有雨')
  })

  it('陣風:50 門檻、49 靜默、undefined 靜默', () => {
    expect(nudgeFor(bundle({ gusts: Array(24).fill(52) }))).toEqual(['陣風風速可達52公里/小時'])
    expect(nudgeFor(bundle({ gusts: Array(24).fill(49) }))).toEqual([])
    expect(nudgeFor(bundle())).toEqual([])
  })
})
