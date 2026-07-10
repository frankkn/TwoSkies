// 以已知新月日期為基準，以月球週期計算當前月相
// 回傳值 0→1：0=新月、0.25=上弦月、0.5=滿月、0.75=下弦月
// 月相對全球觀測者在同一 UTC 時刻相同，直接用 Date.now() 即可
export function getMoonPhase(): number {
  const knownNewMoon = 947182440000 // 2000-01-06T18:14:00Z in ms
  const lunarCycle = 29.530588853 * 24 * 60 * 60 * 1000
  return ((Date.now() - knownNewMoon) % lunarCycle) / lunarCycle
}
