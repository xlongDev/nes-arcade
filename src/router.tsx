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
import type { CategoryFilter } from '@/types/game'

const CATS: CategoryFilter[] = [
  'all',
  'action',
  'shooter',
  'fighting',
  'puzzle',
  'sports',
  'rpg',
  'board',
  'multicart',
]

export type SortKey = 'title' | 'year' | 'size' | 'recent'
const SORTS: SortKey[] = ['title', 'year', 'size', 'recent']

export type SortDir = 'asc' | 'desc'
const DIRS: SortDir[] = ['asc', 'desc']

export interface LibrarySearch {
  q: string
  cat: CategoryFilter
  sort: SortKey
  /** 排序方向;升降序可切,默认 asc */
  dir: SortDir
  fav: boolean
  /** 只看最近游玩(最近 N 款);与 fav 互斥,默认 false */
  recent: boolean
}

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
   */
  validateSearch: (raw: Record<string, unknown>): LibrarySearch => {
    const cat = String(raw.cat ?? 'all') as CategoryFilter
    const sort = String(raw.sort ?? 'title') as SortKey
    const dir = String(raw.dir ?? 'asc') as SortDir
    return {
      q: typeof raw.q === 'string' ? raw.q.slice(0, 60) : '',
      cat: CATS.includes(cat) ? cat : 'all',
      sort: SORTS.includes(sort) ? sort : 'title',
      dir: DIRS.includes(dir) ? dir : 'asc',
      fav: raw.fav === true || raw.fav === 'true',
      recent: raw.recent === true || raw.recent === 'true',
    }
  },
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
