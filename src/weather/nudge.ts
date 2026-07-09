import type { WeatherBundle } from '../types'

// 天氣叮嚀:iPhone 式的一兩句話,由確定性規則從 bundle 推導(Open-Meteo 沒有文字摘要)。
// 鐵律:
// - 不讀 client 時鐘——時間脈絡只來自 bundle 的城市當地 hour 欄位,
//   對方那片的叮嚀才會是對方的時間,測試也才確定
// - 不 import Firebase(test:rules 的 emulator 環境下要能跑)
// - 措辭永遠帶「預計/大約」的誠實 hedge;只描述、不建議——「注意/小心」製造焦慮
// - 沒有值得說的就回空陣列,什麼都不渲染——留白是誠實
// - 無 hysteresis:純函數無狀態就是誠實,句子隨預報變化進出是預報本身在變

const START_PROB = 60 // 降雨開始:機率首次跨過這條線才開口
const STOP_PROB = 30 // 降雨結束:連續兩小時低於這條線
const TOMORROW_DELTA = 4 // 明天高溫差 ≥4° 才值得說
const TOMORROW_RAIN = 60 // 「且有雨」的門檻
const TOMORROW_RAIN_ALONE = 70 // 獨立「預計明天有雨」的門檻(今天要夠乾 <40)
const GUST_KMH = 50 // 40 在東北季風季會變成壁紙;50 才是值得說的風
const LOOKAHEAD = 12 // 只看接下來半天——更遠的交給逐日列

export function nudgeFor(bundle: WeatherBundle): string[] {
  const sentences: string[] = []
  const { now, hourly, daily } = bundle
  const raining = now.kind === 'rain' || now.kind === 'snow'
  // 規則 1 若以「明天」形式開口,規則 3 的雨句要閉嘴(不重複說明天有雨)
  let saidTomorrowRain = false

  if (!raining) {
    // 規則 1:降雨開始。從 [1] 起掃——hourly[0] 的 kind 被即時值覆寫過,不可靠
    for (let i = 1; i <= LOOKAHEAD && i < hourly.length; i++) {
      if (hourly[i].precipProb >= START_PROB) {
        const word = hourly[i].kind === 'snow' ? '下雪' : '下雨'
        // 跨午夜:hour 變小代表已是明天(24h 窗內此判斷含 DST 皆成立)
        const tomorrow = hourly[i].hour < hourly[0].hour
        sentences.push(
          tomorrow
            ? `預計明天大約${hourly[i].hour}時開始${word}`
            : `預計大約${hourly[i].hour}時開始${word}`,
        )
        if (tomorrow) saidTomorrowRain = true
        break
      }
    }
  } else {
    // 規則 2:降雨結束。證據守門:模型得先真的說有雨(某小時 ≥STOP_PROB),
    // 才有資格說它會停——否則毛毛雨 code + 全低機率會捏造出每小時往後滑的假停雨時間
    let evidence = false
    for (let i = 1; i <= LOOKAHEAD && i + 1 < hourly.length; i++) {
      if (hourly[i].precipProb >= STOP_PROB) {
        evidence = true
        continue
      }
      if (evidence && hourly[i].precipProb < STOP_PROB && hourly[i + 1].precipProb < STOP_PROB) {
        const word = now.kind === 'snow' ? '雪' : '雨'
        const tomorrow = hourly[i].hour < hourly[0].hour
        sentences.push(
          tomorrow ? `${word}預計明天${hourly[i].hour}時左右停` : `${word}大約${hourly[i].hour}時會停`,
        )
        break
      }
    }
  }

  // 規則 3:明天走勢(需要 daily[0..1])
  const today = daily[0]
  const tomorrow = daily[1]
  if (today && tomorrow) {
    const delta = tomorrow.high - today.high
    const tomorrowWet = tomorrow.precipProb >= TOMORROW_RAIN && !saidTomorrowRain
    if (delta <= -TOMORROW_DELTA) {
      sentences.push(tomorrowWet ? '預計明天氣溫下降且有雨' : '預計明天氣溫下降')
    } else if (delta >= TOMORROW_DELTA) {
      sentences.push(tomorrowWet ? '預計明天氣溫回升且有雨' : '預計明天氣溫回升')
    } else if (
      !saidTomorrowRain &&
      today.precipProb < 40 &&
      tomorrow.precipProb >= TOMORROW_RAIN_ALONE
    ) {
      sentences.push('預計明天有雨')
    }
  }

  // 規則 4:陣風(gust 是 optional——undefined＝不知道,不開口)
  let maxGust = 0
  for (let i = 0; i <= LOOKAHEAD && i < hourly.length; i++) {
    const g = hourly[i].gust
    if (typeof g === 'number' && g > maxGust) maxGust = g
  }
  if (maxGust >= GUST_KMH) {
    sentences.push(`陣風風速可達${maxGust}公里/小時`)
  }

  return sentences.slice(0, 2)
}
