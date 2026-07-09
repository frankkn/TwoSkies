// tz 是使用者可寫欄位，IANA 合法性 rules 驗不了——渲染一律 try/catch fallback UTC（見 CLAUDE.md）
import { useEffect, useState } from 'react'

export function dateKeyFor(tz: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(date)
  }
}

export function localTimeIn(tz: string, date = new Date()): string {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
  try {
    return new Intl.DateTimeFormat('zh-TW', { ...opts, timeZone: tz }).format(date)
  } catch {
    return new Intl.DateTimeFormat('zh-TW', { ...opts, timeZone: 'UTC' }).format(date)
  }
}

export function checkinId(dateKey: string, uid: string): string {
  return `${dateKey}_${uid}`
}

/** 該時區的目前時刻（HH:mm），每 30 秒跳動——SkyPane 與 HorizonStrip 共用 */
export function useNow(tz: string): string {
  const [now, setNow] = useState(() => localTimeIn(tz))
  useEffect(() => {
    setNow(localTimeIn(tz))
    const timer = setInterval(() => setNow(localTimeIn(tz)), 30_000)
    return () => clearInterval(timer)
  }, [tz])
  return now
}
