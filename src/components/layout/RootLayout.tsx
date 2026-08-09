import { Outlet, useRouterState } from '@tanstack/react-router'
import { Aurora } from './Aurora'
import { TopBar } from './TopBar'
import { useThemeSync } from '@/lib/useThemeSync'
import { ToastHost } from '@/components/ui/Toast'

export function RootLayout() {
  useThemeSync()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inGame = pathname.startsWith('/play/')

  return (
    <>
      <Aurora paused={inGame} />
      {/* 游戏页自带精简顶栏，避免两条栏叠在一起抢空间 */}
      {!inGame && <TopBar />}
      <main className="relative z-2">
        <Outlet />
      </main>
      <ToastHost />
    </>
  )
}
