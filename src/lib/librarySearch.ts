import type { CategoryFilter } from '@/types/game'

export type SortKey = 'title' | 'year' | 'size' | 'recent'
export type SortDir = 'asc' | 'desc'

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

const SORTS: SortKey[] = ['title', 'year', 'size', 'recent']
const DIRS: SortDir[] = ['asc', 'desc']

/**
 * 把任意 URL 原始 search 参数收敛成受控的 LibrarySearch。
 * 信任边界：所有外部输入都经过白名单 / 长度裁剪，非法值回落到安全默认。
 */
export function validateLibrarySearch(raw: Record<string, unknown>): LibrarySearch {
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
}
