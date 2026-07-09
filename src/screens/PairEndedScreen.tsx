import { NightBackdrop } from '../components/NightBackdrop'
import { provider } from '../data'

export function PairEndedScreen() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <NightBackdrop />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-white">
        <p className="text-xl font-light">配對已結束</p>
        <p className="text-sm opacity-70">天空一直都在</p>
        <button
          className="mt-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm text-white/90 backdrop-blur transition-colors hover:bg-white/20"
          onClick={() => provider.acknowledgePairEnded()}
        >
          回到自己的天空
        </button>
      </div>
    </main>
  )
}
