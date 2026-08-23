import { useMemo } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Game } from '@/types/game'
import type { LibrarySearch, SortDir, SortKey } from '@/router'
import { GAMES } from '@/data/games'
import { useLibrary } from '@/stores/library'

/**
 * Fuse 配置。
 * keys 加权让标题 > 拼音 ≈ 首字母 > 别名 > 描述,与两段式(精确子串 + 模糊)并存;
 * threshold 0.36 容许 1-2 字拼写错误,再大就开始噪音了。
 */
const FUSE_OPTS: IFuseOptions<Game> = {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'pinyin', weight: 2 },
    { name: 'initials', weight: 2 },
    { name: 'alias', weight: 1.5 },
    { name: 'desc', weight: 0.4 },
  ],
  threshold: 0.36,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

function sortGames(list: Game[], sort: SortKey, dir: SortDir, recentOrder: Map<string, number>): Game[] {
  const out = [...list]
  // 每个 sort 内部的「自然方向」是固定的(例:year 习惯升序、size 习惯降序),
  // dir=desc 时取反,这样升降序按钮按下能切两套方向,而不是只能切正反向
  const sign = dir === 'desc' ? -1 : 1
  switch (sort) {
    case 'year': {
      // 没有年份的永远排末尾,无论升降
      return out.sort((a, b) => {
        const ya = a.year ?? 9999
        const yb = b.year ?? 9999
        if (ya !== yb) return (ya - yb) * sign
        // 升降序相同时,用名称做兜底保持稳定,避免排序抖动
        const t = a.title.localeCompare(b.title, 'zh-Hans-CN') * sign
        return t === 0 ? ya - yb : t
      })
    }
    case 'size':
      return out.sort((a, b) => (b.bytes - a.bytes) * sign)
    case 'recent':
      return out.sort((a, b) => ((recentOrder.get(b.id) ?? 0) - (recentOrder.get(a.id) ?? 0)) * sign)
    case 'title':
    default:
      return out.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN') * sign)
  }
}

export function useGameSearch(search: LibrarySearch, extraGames: Game[] = []) {
  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)

  const pool = useMemo(
    () => (extraGames.length ? [...extraGames, ...GAMES] : GAMES),
    [extraGames],
  )

  // Fuse 实例跟 pool 走 —— extraGames 也能进模糊索引;
  // 自定义 ROM 没拼音 / 别名,主要靠 title + desc(为空)兜底,不会拖噪音
  const fuse = useMemo(() => new Fuse(pool, FUSE_OPTS), [pool])

  const recentOrder = useMemo(
    () => new Map(recents.map((r) => [r.gameId, r.playedAt])),
    [recents],
  )

  return useMemo(() => {
    const q = search.q.trim().toLowerCase()
    let list = pool

    if (q) {
      const exact = list.filter((g) => g.haystack.includes(q))
      list = exact.length ? exact : (fuse.search(q).map((r) => r.item) as Game[])
    }

    if (search.cat !== 'all') list = list.filter((g) => g.category === search.cat)
    if (search.fav) list = list.filter((g) => favorites.includes(g.id))
    if (search.recent) list = list.filter((g) => recentOrder.has(g.id))

    // 搜索时按相关度(命中位置)排,不要被字母序打乱 —— 但 sortGames 仍按 dir 翻转
    if (q && search.sort === 'title' && search.dir === 'asc') {
      return [...list].sort((a, b) => a.haystack.indexOf(q) - b.haystack.indexOf(q))
    }
    return sortGames(list, search.sort, search.dir, recentOrder)
  }, [pool, fuse, search.q, search.cat, search.fav, search.recent, search.sort, search.dir, favorites, recentOrder])
}
