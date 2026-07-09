import { useEffect, useState } from 'react'
import { provider } from './data'
import type { AppState } from './data/provider'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PairedScreen } from './screens/PairedScreen'
import { PairEndedScreen } from './screens/PairEndedScreen'
import { PendingScreen } from './screens/PendingScreen'
import { SignInScreen } from './screens/SignInScreen'
import { SoloScreen } from './screens/SoloScreen'

// 所有畫面由根狀態機導出，禁止元件自行判斷（見 CLAUDE.md client 架構）
export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading' })
  useEffect(() => provider.subscribeAppState(setState), [])

  switch (state.phase) {
    case 'loading':
      return <div className="h-dvh bg-slate-950" />
    case 'unauthenticated':
      return <SignInScreen />
    case 'onboarding':
      return <OnboardingScreen />
    case 'solo':
      return <SoloScreen me={state.me} />
    case 'pending':
      return <PendingScreen me={state.me} inviteCode={state.inviteCode} />
    case 'paired':
      return <PairedScreen me={state.me} partner={state.partner} pairId={state.pairId} />
    case 'pair-ended':
      return <PairEndedScreen />
  }
}
