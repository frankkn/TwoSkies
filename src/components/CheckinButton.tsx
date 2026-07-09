import { useState } from 'react'

interface Props {
  checked: boolean
  offline?: boolean
  /** 對方的稱呼——已打卡文案「今天看過{暱稱}的天空了」 */
  partnerNickname: string
  onCheckin: () => Promise<void>
}

// 打卡是這個產品唯一的儀式：一行半透明文字，像天空的一部分，不是一顆 UI 按鈕。
// 悲觀更新：等 provider resolve（= server ack）才由訂閱翻轉狀態；點過即安靜變化
export function CheckinButton({ checked, offline, partnerNickname, onCheckin }: Props) {
  const [busy, setBusy] = useState(false)

  if (checked) {
    return (
      <p className="rounded-full bg-slate-900/25 px-4 py-2 text-sm text-white/60 backdrop-blur-md">
        今天看過{partnerNickname}的天空了
      </p>
    )
  }

  // 打卡不走離線佇列——離線佇列是「補打卡」；安靜的不可用態，不報錯
  if (offline) {
    return (
      <p className="rounded-full bg-slate-900/25 px-4 py-2 text-sm text-white/45 backdrop-blur-md">
        天空暫時斷線
      </p>
    )
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await onCheckin()
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-full bg-slate-900/30 px-4 py-2 text-sm text-white/90 backdrop-blur-md transition-colors hover:bg-slate-900/45 hover:text-white disabled:opacity-40"
    >
      我來看過你的天空了
    </button>
  )
}
