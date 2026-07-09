export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow'

export interface CurrentWeather {
  kind: WeatherKind
  temperature: number
  isDay: boolean
}

export type WeatherStatus =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; weather: CurrentWeather }

export interface Profile {
  uid: string
  nickname: string
  city: string
  lat: number
  lng: number
  tz: string
}
