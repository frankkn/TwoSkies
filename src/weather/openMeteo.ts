import type { DayPoint, HourPoint, WeatherBundle, WeatherKind } from '../types'

// WMO weather code → 四種天空
// 0-1 晴、2-3 雲、45/48 霧（歸雲）、71-77/85-86 雪，其餘（毛毛雨、雨、雷雨）歸雨
export function weatherKindFromWmo(code: number | null | undefined): WeatherKind {
  if (code == null || !isFinite(code)) return 'cloudy' // 無資料時顯示雲，不造雨不造晴
  if (code <= 1) return 'clear'
  if (code <= 3 || code === 45 || code === 48) return 'cloudy'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  return 'rain'
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherBundle> {
  // timezone=auto：hourly/daily 的時間直接是該座標的當地時間——
  // 對方那片的預報就該用對方的時鐘
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,is_day,wind_gusts_10m&forecast_hours=24` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=10` +
    `&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  const json = await res.json()

  const current = json.current
  const now = {
    temperature: Math.round(current.temperature_2m),
    kind: weatherKindFromWmo(current.weather_code),
    isDay: current.is_day === 1,
  }

  const hourly: HourPoint[] = ((json.hourly?.time ?? []) as string[]).map((t, i) => {
    const gustRaw = json.hourly.wind_gusts_10m?.[i]
    return {
      hour: Number(t.slice(11, 13)),
      kind: weatherKindFromWmo(json.hourly.weather_code?.[i] ?? 0),
      isDay: (json.hourly.is_day?.[i] ?? 1) === 1,
      temperature: Math.round(json.hourly.temperature_2m?.[i] ?? 0),
      precipProb: Math.round(json.hourly.precipitation_probability?.[i] ?? 0),
      gust: typeof gustRaw === 'number' ? Math.round(gustRaw) : undefined,
    }
  })

  // 「現在」那格顯示即時值，跟右上角的大字一致——
  // hourly[0] 是「這個小時」的整點值，一小時內升降溫時會跟即時值差 1°
  if (hourly[0]) {
    hourly[0] = { ...hourly[0], temperature: now.temperature, kind: now.kind, isDay: now.isDay }
  }

  const daily: DayPoint[] = ((json.daily?.time ?? []) as string[]).map((date, i) => ({
    date,
    kind: weatherKindFromWmo(json.daily.weather_code?.[i]),
    high: Math.round(json.daily.temperature_2m_max?.[i] ?? 0),
    low: Math.round(json.daily.temperature_2m_min?.[i] ?? 0),
    precipProb: Math.round(json.daily.precipitation_probability_max?.[i] ?? 0),
  }))

  const today = daily[0]
    ? { high: daily[0].high, low: daily[0].low, precipProb: daily[0].precipProb }
    : { high: now.temperature, low: now.temperature, precipProb: 0 }

  return { now, today, hourly, daily }
}

/** 指定某一天（當地日期 YYYY-MM-DD）的完整 24 小時——七天列點開時現抓 */
export async function fetchDayHourly(lat: number, lng: number, date: string, signal?: AbortSignal): Promise<HourPoint[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,is_day` +
    `&start_date=${date}&end_date=${date}&timezone=auto`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  const json = await res.json()
  return ((json.hourly?.time ?? []) as string[]).map((t, i) => ({
    hour: Number(t.slice(11, 13)),
    kind: weatherKindFromWmo(json.hourly.weather_code?.[i] ?? 0),
    isDay: (json.hourly.is_day?.[i] ?? 1) === 1,
    temperature: Math.round(json.hourly.temperature_2m?.[i] ?? 0),
    precipProb: Math.round(json.hourly.precipitation_probability?.[i] ?? 0),
  }))
}
