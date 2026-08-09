import { Outlet, useRouterState } from '@tanstack/react-router'
import { Aurora } from './Aurora'
import { TopBar } from './TopBar'
import { useThemeSync } from '@/lib/useThemeSync'
import { ToastHost } from '@/components/ui/Toast'
import { ConfirmHost } from '@/components/ui/ConfirmDialog'

export function RootLayout() {
  useThemeSync()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inGame = pathname.startsWith('/play/')

  return (
    <>
      {/* 键盘用户不必每次 Tab 穿过整条顶栏才能摸到内容（WCAG 2.4.1） */}
      <a href="#main" className="skip-link">
        跳至主内容
      </a>
      <Aurora paused={inGame} />
      {/* 游戏页自带精简顶栏，避免两条栏叠在一起抢空间 */}
      {!inGame && <TopBar />}
      <main id="main" tabIndex={-1} className="relative z-2 outline-none">
        <Outlet />
      </main>
      <ToastHost />
      <ConfirmHost />
    </>
  )
}
