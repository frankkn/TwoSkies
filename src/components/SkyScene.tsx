import type { WeatherKind, WeatherNow } from '../types'

// 確定性偽隨機：同一顆星、同一絲雨每次 render 都在同個位置，畫面才安靜
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const GRADIENTS: Record<WeatherKind, { day: string; night: string }> = {
  clear: {
    day: 'from-sky-500 via-sky-300 to-amber-100',
    night: 'from-slate-950 via-indigo-950 to-slate-800',
  },
  cloudy: {
    day: 'from-slate-500 via-slate-400 to-slate-300',
    night: 'from-slate-950 via-slate-800 to-slate-700',
  },
  rain: {
    day: 'from-slate-600 via-slate-500 to-slate-400',
    night: 'from-slate-950 via-slate-900 to-slate-700',
  },
  snow: {
    day: 'from-slate-400 via-slate-300 to-slate-200',
    night: 'from-slate-900 via-slate-700 to-slate-600',
  },
}

export function SkyScene({ sky, error, moonPhase = 0.5 }: { sky: WeatherNow | null; error?: boolean; moonPhase?: number }) {
  if (!sky) {
    // 「雲層後面的天空」占位：抓不到天氣時不報錯嚇人
    return (
      <div className="absolute inset-0 bg-linear-to-b from-slate-600 via-slate-500 to-slate-400">
        <Clouds tone="dim" />
        {error && (
          <p className="absolute inset-x-0 bottom-1/3 text-center text-sm text-white/50">
            雲層後面的天空
          </p>
        )}
      </div>
    )
  }

  const { kind, isDay } = sky
  return (
    <div className={`absolute inset-0 bg-linear-to-b ${GRADIENTS[kind][isDay ? 'day' : 'night']}`}>
      {!isDay && (kind === 'clear' || kind === 'cloudy') && <Stars faint={kind === 'cloudy'} />}
      {kind === 'clear' && (isDay ? <Sun /> : <Moon phase={moonPhase} />)}
      {kind !== 'clear' && <Clouds tone={isDay ? 'light' : 'dark'} />}
      {kind === 'rain' && <Rain />}
      {kind === 'snow' && <Snow />}
    </div>
  )
}

function Stars({ faint }: { faint?: boolean }) {
  return (
    <div className={faint ? 'opacity-40' : undefined}>
      {Array.from({ length: 48 }, (_, i) => {
        const size = rand(i, 3) > 0.85 ? 2.5 : 1.5
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${rand(i, 1) * 100}%`,
              top: `${rand(i, 2) * 85}%`,
              width: size,
              height: size,
              animation: `twinkle ${2 + rand(i, 4) * 3}s ease-in-out ${-rand(i, 5) * 3}s infinite`,
            }}
          />
        )
      })}
    </div>
  )
}

// 太陽/月亮掛在頂部中央、完整可見——左邊的名字和右邊的溫度都不會被壓到
function Sun() {
  return (
    <>
      <div className="absolute -top-6 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-100/70 blur-2xl" />
      <div className="absolute top-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-amber-50/90 blur-[2px]" />
    </>
  )
}

// SVG 弧線路徑：切出月相亮面（右半圓=上弦；左半圓=下弦；終結線橢圓決定眉月或凸月）
function getMoonPath(phase: number, r: number): string | null {
  if (phase < 0.01 || phase > 0.99) return null
  const cx = r, cy = r
  const top = `${cx} ${cy - r}`, bot = `${cx} ${cy + r}`
  // tx = cos(phase×2π)×r：新月時=+r、弦月時=0、滿月時=-r
  const tx = Math.cos(phase * 2 * Math.PI) * r
  const atx = Math.abs(tx)
  if (phase < 0.5) {
    // 上弦：右半圓(sweep=1) + 終結線橢圓
    // tx>0(眉月)→sweep=0(橢圓左彎，細右條)；tx<0(凸月)→sweep=1(右彎，左延伸)
    const s2 = tx >= 0 ? 0 : 1
    return `M ${top} A ${r} ${r} 0 0 1 ${bot} A ${atx} ${r} 0 0 ${s2} ${top} Z`
  } else {
    // 下弦：左半圓(sweep=0) + 終結線橢圓
    // tx<0(凸月)→sweep=0(右延伸)；tx>0(眉月)→sweep=1(橢圓右彎，細左條)
    const s2 = tx >= 0 ? 1 : 0
    return `M ${top} A ${r} ${r} 0 0 0 ${bot} A ${atx} ${r} 0 0 ${s2} ${top} Z`
  }
}

function Moon({ phase }: { phase: number }) {
  const r = 24
  const size = r * 2
  // illum: 0=新月、1=滿月；月暈隨亮度縮放
  const illum = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI)
  const glowPx = 6 + illum * 20
  const glowA = 0.1 + illum * 0.3
  const path = getMoonPath(phase, r)
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2"
      style={{ filter: `drop-shadow(0 0 ${glowPx}px rgba(255,255,255,${glowA.toFixed(2)}))` }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {/* 暗碟：讓新月的月輪也隱約可見 */}
        <circle cx={r} cy={r} r={r - 0.5} fill="rgba(15,23,42,0.55)" />
        {path && <path d={path} fill="rgb(226,232,240)" />}
      </svg>
    </div>
  )
}

function Clouds({ tone }: { tone: 'light' | 'dark' | 'dim' }) {
  const bg =
    tone === 'light' ? 'bg-white/70' : tone === 'dark' ? 'bg-slate-400/25' : 'bg-slate-300/30'
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className={`absolute rounded-full blur-xl ${bg}`}
          style={{
            top: `${8 + rand(i, 6) * 45}%`,
            left: '-38%',
            width: `${28 + rand(i, 7) * 25}%`,
            height: `${12 + rand(i, 8) * 10}%`,
            animation: `drift ${80 + rand(i, 9) * 70}s linear ${-rand(i, 10) * 120}s infinite`,
          }}
        />
      ))}
    </>
  )
}

function Rain() {
  return (
    <div className="absolute -inset-x-4 inset-y-0 rotate-6">
      {Array.from({ length: 56 }, (_, i) => (
        <span
          key={i}
          className="absolute w-px bg-white/40"
          style={{
            left: `${rand(i, 11) * 100}%`,
            top: '-8vh',
            height: `${10 + rand(i, 12) * 14}px`,
            animation: `fall ${1.4 + rand(i, 13) * 1.0}s linear ${-rand(i, 14) * 2.4}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function Snow() {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 36 }, (_, i) => {
        const size = 2 + rand(i, 15) * 2.5
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white/80"
            style={{
              left: `${rand(i, 16) * 100}%`,
              top: '-8vh',
              width: size,
              height: size,
              animation: `snowfall ${9 + rand(i, 17) * 7}s linear ${-rand(i, 18) * 16}s infinite`,
            }}
          />
        )
      })}
    </div>
  )
}
