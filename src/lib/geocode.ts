// 城市選擇用 Open-Meteo Geocoding：一次取得一致的 name/lat/lng/timezone，
// 不用 navigator.geolocation（精度本來就要丟掉，見 CLAUDE.md）

export interface CityResult {
  name: string
  region: string
  lat: number
  lng: number
  tz: string
}

export async function searchCities(query: string): Promise<CityResult[]> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(query)}&count=5&language=zh`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  interface Raw {
    name: string
    latitude: number
    longitude: number
    timezone: string
    country?: string
    admin1?: string
  }
  return ((json.results ?? []) as Raw[]).map(r => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join('，'),
    lat: r.latitude,
    lng: r.longitude,
    tz: r.timezone,
  }))
}

/** 粗化到 0.1°（約 10 公里）——寫入前必經，rules 也會驗證 */
export function coarsen(v: number): number {
  return Math.round(v * 10) / 10
}
