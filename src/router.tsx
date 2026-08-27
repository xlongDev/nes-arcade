import {
  createRootRoute,
  createRoute,
  createRouter,
  createHashHistory,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { PagePending } from '@/components/ui/PagePending'
import { LibraryPage } from '@/pages/LibraryPage'
import { NotFound } from '@/pages/NotFound'
import { RouteError } from '@/components/RouteError'
import { validateLibrarySearch } from '@/lib/librarySearch'

// 真实定义位于 @/lib/librarySearch，这里仅做类型再导出，保持既有 @/router 引用不变
export type { LibrarySearch, SortDir, SortKey } from '@/lib/librarySearch'

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LibraryPage,
  /**
   * 类型安全的 search params：筛选状态直接写进 URL，
   * 于是「筛完的列表」天然可分享、可后退、可刷新恢复。
   * 校验逻辑收敛在 validateLibrarySearch（纯函数，可单测）。
   */
  validateSearch: validateLibrarySearch,
})

const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/$gameId',
  // 模拟器（含 3MB WASM 引导逻辑）只在进入游戏页时才加载
  component: lazyRouteComponent(() => import('@/pages/PlayPage'), 'PlayPage'),
  pendingComponent: PagePending,
})

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/upload',
  component: lazyRouteComponent(() => import('@/pages/UploadPage'), 'UploadPage'),
  pendingComponent: PagePending,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('@/pages/SettingsPage'), 'SettingsPage'),
  pendingComponent: PagePending,
})

const routeTree = rootRoute.addChildren([indexRoute, playRoute, uploadRoute, settingsRoute])

export const router = createRouter({
  routeTree,
  // hash 路由：静态托管零配置，不需要服务端 rewrite
  history: createHashHistory(),
  // 任意路由渲染期抛错（WASM / ROM / 解析异常）统一兜底，不再整页白屏
  defaultErrorComponent: RouteError,
  defaultPreload: 'intent',
  defaultPreloadDelay: 60,
  scrollRestoration: true,
  defaultStructuralSharing: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
