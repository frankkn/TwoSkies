import { useState } from 'react'
import { provider } from '../data'
import type { Profile } from '../types'
import { ProfileForm } from './ProfileForm'

interface Props {
  me: Profile
  paired: boolean
  onClose: () => void
}

export function SettingsSheet({ me, paired, onClose }: Props) {
  const [confirmUnpair, setConfirmUnpair] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-5 rounded-t-2xl bg-slate-900/95 p-6 text-white sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <ProfileForm
          initial={{ nickname: me.nickname, city: me.city, lat: me.lat, lng: me.lng, tz: me.tz }}
          submitLabel="儲存"
          onSubmit={async input => {
            await provider.saveProfile(input)
            onClose()
          }}
        />

        <hr className="border-white/10" />

        {paired &&
          (confirmUnpair ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm opacity-80">解除後立刻刪除所有共享的資料，不另行通知對方。</p>
              <div className="flex gap-3">
                <button
                  disabled={busy}
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm disabled:opacity-40"
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await provider.unpair()
                      onClose()
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  確定解除
                </button>
                <button
                  className="px-4 py-1.5 text-sm opacity-60 hover:opacity-90"
                  onClick={() => setConfirmUnpair(false)}
                >
                  再想想
                </button>
              </div>
            </div>
          ) : (
            <button
              className="self-start text-sm opacity-60 hover:opacity-90"
              onClick={() => setConfirmUnpair(true)}
            >
              解除配對
            </button>
          ))}

        <div className="flex items-center justify-between">
          <button className="text-sm opacity-50 hover:opacity-80" onClick={() => provider.signOut()}>
            登出
          </button>
          <button className="text-sm opacity-60 hover:opacity-90" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
