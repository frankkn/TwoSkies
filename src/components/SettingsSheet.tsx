import type { ReactNode } from 'react'
import { provider } from '../data'
import type { Profile } from '../types'
import { ProfileForm } from './ProfileForm'

interface Props {
  me: Profile
  /** 各狀態自己的配對區塊（solo：邀請/輸入邀請碼；paired：解除配對） */
  pairingSection?: ReactNode
  onClose: () => void
}

export function SettingsSheet({ me, pairingSection, onClose }: Props) {
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

        {pairingSection && (
          <>
            <hr className="border-white/10" />
            {pairingSection}
          </>
        )}

        <hr className="border-white/10" />

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
