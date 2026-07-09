import type { WeatherKind } from '../types'

interface Props {
  kind: WeatherKind
  isDay?: boolean
  size?: number
}

/** 彩色天氣圖示（iPhone 天氣的視覺語彙）：晴日太陽、晴夜月亮、雲、雨、雪 */
export function WeatherIcon({ kind, isDay = true, size = 18 }: Props) {
  if (kind === 'clear') return isDay ? <Sun size={size} /> : <Moon size={size} />
  if (kind === 'cloudy') return <Cloud size={size} />
  if (kind === 'rain') return <Rain size={size} />
  return <Snow size={size} />
}

function Sun({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4.6" fill="#fde68a" stroke="#fbbf24" strokeWidth="1" />
      <g stroke="#fcd34d" strokeWidth="1.7" strokeLinecap="round">
        <line x1="12" y1="1.8" x2="12" y2="4.2" />
        <line x1="12" y1="19.8" x2="12" y2="22.2" />
        <line x1="1.8" y1="12" x2="4.2" y2="12" />
        <line x1="19.8" y1="12" x2="22.2" y2="12" />
        <line x1="4.8" y1="4.8" x2="6.5" y2="6.5" />
        <line x1="17.5" y1="17.5" x2="19.2" y2="19.2" />
        <line x1="4.8" y1="19.2" x2="6.5" y2="17.5" />
        <line x1="17.5" y1="6.5" x2="19.2" y2="4.8" />
      </g>
    </svg>
  )
}

function Moon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20.5 13.6A8.6 8.6 0 1 1 10.4 3.5a6.8 6.8 0 0 0 10.1 10.1Z"
        fill="#fef9c3"
        stroke="#fde68a"
        strokeWidth="1"
      />
    </svg>
  )
}

const CLOUD_PATH =
  'M6.8 19a4.3 4.3 0 0 1-.4-8.58 5.8 5.8 0 0 1 11.3-1.36A4.55 4.55 0 0 1 17.1 19H6.8Z'
const SMALL_CLOUD_PATH =
  'M7 15.5a3.6 3.6 0 0 1-.34-7.18A4.9 4.9 0 0 1 16.2 7.2a3.8 3.8 0 0 1-.5 8.3H7Z'

function Cloud({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={CLOUD_PATH} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
    </svg>
  )
}

function Rain({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={SMALL_CLOUD_PATH} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <g stroke="#7dd3fc" strokeWidth="1.7" strokeLinecap="round">
        <line x1="8.6" y1="18" x2="7.8" y2="21" />
        <line x1="12.4" y1="18" x2="11.6" y2="21" />
        <line x1="16.2" y1="18" x2="15.4" y2="21" />
      </g>
    </svg>
  )
}

function Snow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={SMALL_CLOUD_PATH} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <g fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5">
        <circle cx="8.4" cy="19" r="1.3" />
        <circle cx="12.4" cy="21" r="1.3" />
        <circle cx="16.4" cy="19" r="1.3" />
      </g>
    </svg>
  )
}
