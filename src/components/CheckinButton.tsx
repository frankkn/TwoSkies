import { useState } from 'react'

interface Props {
  checked: boolean
  offline?: boolean
  onCheckin: () => Promise<void>
}

// 悲觀更新：等 provider resolve（= server ack）才由訂閱翻轉狀態；
// 點過即安靜地變為已點狀態——不彈窗、不慶祝
export function CheckinButton({ checked, offline, onCheckin }: Props) {
  const [busy, setBusy] = useState(false)

  if (checked) {
    return (
      <p className="rounded-full border border-white/20 bg-slate-900/20 px-5 py-2 text-sm text-white/70 backdrop-blur-md">
        今天來看過了
      </p>
    )
  }

  // 打卡不走離線佇列——離線佇列是「補打卡」；安靜的不可用態，不報錯
  if (offline) {
    return (
      <p className="rounded-full border border-white/15 bg-slate-900/20 px-5 py-2 text-sm text-white/50 backdrop-blur-md">
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
      className="rounded-full border border-white/30 bg-slate-900/30 px-5 py-2 text-sm text-white backdrop-blur-md transition-colors hover:bg-slate-900/45 disabled:opacity-50"
    >
      我來看過你的天空了
    </button>
  )
}
