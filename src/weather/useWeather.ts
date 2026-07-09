import { useEffect, useRef, useState } from 'react'
import type { WeatherStatus } from '../types'
import { fetchCurrentWeather } from './openMeteo'

const STALE_MS = 15 * 60 * 1000

// 開啟時抓取＋每 15 分鐘更新＋座標變更立即重抓；背景分頁的 setInterval 會被
// 瀏覽器節流，所以回到前景時（visibilitychange）過期就補抓（見 CLAUDE.md）
export function useWeather(lat: number, lng: number): WeatherStatus {
  const [state, setState] = useState<WeatherStatus>({ status: 'loading' })
  const lastFetchAt = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      lastFetchAt.current = Date.now()
      try {
        const weather = await fetchCurrentWeather(lat, lng)
        if (!cancelled) setState({ status: 'ok', weather })
      } catch {
        // 抓不到就顯示「雲層後面的天空」；已有資料時保留舊資料，不嚇人
        if (!cancelled) setState(prev => (prev.status === 'ok' ? prev : { status: 'error' }))
      }
    }

    setState({ status: 'loading' })
    load()

    const timer = setInterval(load, STALE_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchAt.current > STALE_MS) {
        load()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [lat, lng])

  return state
}
