// tz 是使用者可寫欄位，IANA 合法性 rules 驗不了——渲染一律 try/catch fallback UTC（見 CLAUDE.md）

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
