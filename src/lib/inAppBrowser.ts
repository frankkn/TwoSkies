import { Capacitor } from '@capacitor/core'

// Google 的「使用安全瀏覽器」政策擋掉所有 app 內嵌 WebView 的 OAuth
// （403 disallowed_useragent）。在登入前先認出這些環境，給一條出路，
// 而不是讓人撞上 Google 的紅色錯誤頁
export function isInAppBrowser(): boolean {
  // 原生殼走原生 Credential Manager 登入，不受此政策影響
  if (Capacitor.isNativePlatform()) return false
  const ua = navigator.userAgent
  // 常見內嵌瀏覽器的明確標記：LINE / Facebook / Messenger / Instagram / WeChat / KakaoTalk / Google app
  if (/(Line\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|KAKAOTALK|GSA\/)/.test(ua)) return true
  // Android WebView 的通用標記
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return true
  // iOS WKWebView 的 UA 沒有 Safari token；排除「加入主畫面」的 standalone 模式
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const standalone = (navigator as { standalone?: boolean }).standalone === true
  if (isIOS && !standalone && !/Safari\//.test(ua)) return true
  return false
}
