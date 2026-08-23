import { useEffect } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Aurora } from './Aurora'
import { TopBar } from './TopBar'
import { Footer } from './Footer'
import { useThemeSync } from '@/lib/useThemeSync'
import { autoScanDirs } from '@/lib/dirSources'
import { ToastHost } from '@/components/ui/Toast'
import { ConfirmHost } from '@/components/ui/ConfirmDialog'

export function RootLayout() {
  useThemeSync()

  // 启动后自动扫描已添加的游戏目录，把新增 ROM 收录进本地库（幂等）
  useEffect(() => {
    void autoScanDirs()
  }, [])

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
        {inGame ? (
          <Outlet />
        ) : (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        )}
      </main>
      {/* 游戏页沉浸式体验不需要底部栏 */}
      {!inGame && <Footer />}
      <ToastHost />
      <ConfirmHost />
    </>
  )
}
