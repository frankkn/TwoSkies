// 去掉易混淆字元（0/o、1/l/i）；10 字元 ≈ 49 bits，配合禁止 list 足以防枚舉
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

export function generateInviteCode(length = 10): string {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return [...values].map(v => ALPHABET[v % ALPHABET.length]).join('')
}

export function inviteLink(code: string): string {
  return `${location.origin}${location.pathname}#invite=${code}`
}

export function inviteCodeFromHash(hash: string): string | null {
  const match = hash.match(/#invite=([a-z0-9]{8,64})/)
  return match ? match[1] : null
}
