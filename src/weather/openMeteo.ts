import type { CurrentWeather, WeatherKind } from '../types'

// WMO weather code → 四種天空
// 0-1 晴、2-3 雲、45/48 霧（歸雲）、71-77/85-86 雪，其餘（毛毛雨、雨、雷雨）歸雨
export function weatherKindFromWmo(code: number): WeatherKind {
  if (code <= 1) return 'clear'
  if (code <= 3 || code === 45 || code === 48) return 'cloudy'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  return 'rain'
}

export async function fetchCurrentWeather(lat: number, lng: number): Promise<CurrentWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  const json = await res.json()
  const current = json.current
  return {
    temperature: Math.round(current.temperature_2m),
    kind: weatherKindFromWmo(current.weather_code),
    isDay: current.is_day === 1,
  }
}
