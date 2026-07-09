// 去掉易混淆字元（0/o、1/l/i）；10 字元 ≈ 49 bits，配合禁止 list 足以防枚舉
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

export function generateInviteCode(length = 10): string {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return [...values].map(v => ALPHABET[v % ALPHABET.length]).join('')
}

export function inviteLink(code: string): string {
  // openExternalBrowser=1 是 LINE 內建瀏覽器的官方逃生門：LINE 會改用外部瀏覽器開，
  // 避開 Google 對 WebView OAuth 的封鎖（403 disallowed_useragent）；其他環境忽略此參數
  return `${location.origin}${location.pathname}?openExternalBrowser=1#invite=${code}`
}

export function inviteCodeFromHash(hash: string): string | null {
  const match = hash.match(/#invite=([a-z0-9]{8,64})/)
  return match ? match[1] : null
}
