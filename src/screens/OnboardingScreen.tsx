import { NightBackdrop } from '../components/NightBackdrop'
import { ProfileForm } from '../components/ProfileForm'
import { provider } from '../data'

export function OnboardingScreen() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <NightBackdrop />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col gap-5 text-white">
          <h2 className="text-xl font-light">先告訴天空你是誰</h2>
          <ProfileForm submitLabel="開始" onSubmit={input => provider.saveProfile(input)} />
          <p className="text-xs leading-relaxed opacity-60">
            配對之後，對方會知道你在哪個城市（約 10 公里的精度）——天空跟著人走。
            位置隨時可以改，也隨時可以解除配對。
          </p>
        </div>
      </div>
    </main>
  )
}
