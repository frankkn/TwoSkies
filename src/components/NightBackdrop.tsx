import { SkyScene } from './SkyScene'

/** 尚未有天氣資料的畫面（登入、onboarding、配對已結束）鋪一片安靜的晴夜 */
export function NightBackdrop() {
  return <SkyScene weather={{ status: 'ok', weather: { kind: 'clear', isDay: false, temperature: 0 } }} />
}
