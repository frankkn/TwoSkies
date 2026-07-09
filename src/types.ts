export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow'

export interface WeatherNow {
  kind: WeatherKind
  temperature: number
  isDay: boolean
}

export interface HourPoint {
  /** 當地時間的小時（0-23）——對方那片顯示的是對方的時間 */
  hour: number
  kind: WeatherKind
  isDay: boolean
  temperature: number
  precipProb: number
  /** 陣風 km/h。只有 fetchWeather 會給；fetchDayHourly（手風琴）不抓風——
      optional 是誠實：undefined＝不知道，不是 0＝無風 */
  gust?: number
}

export interface DayPoint {
  /** 當地日期 YYYY-MM-DD */
  date: string
  kind: WeatherKind
  high: number
  low: number
  precipProb: number
}

export interface WeatherBundle {
  now: WeatherNow
  today: { high: number; low: number; precipProb: number }
  /** 未來 24 小時（含當前小時，當地時間） */
  hourly: HourPoint[]
  /** 今天起 10 天 */
  daily: DayPoint[]
}

export type WeatherStatus =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; weather: WeatherBundle }

export interface Profile {
  uid: string
  nickname: string
  city: string
  lat: number
  lng: number
  tz: string
}
