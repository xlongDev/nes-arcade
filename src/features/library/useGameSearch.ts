import { useMemo } from 'react'
import Fuse from 'fuse.js'
import type { Game } from '@/types/game'
import type { LibrarySearch, SortKey } from '@/router'
import { GAMES } from '@/data/games'
import { useLibrary } from '@/stores/library'

/**
 * 两段式搜索：
 *   1. 子串命中（标题 / 拼音全拼 / 拼音首字母 / 英文别名）—— 覆盖 95% 的输入，零误差
 *   2. Fuse 模糊兜底 —— 只在第一段没结果时启用，容忍拼写错误
 *
 * 为什么不直接上 Fuse：模糊匹配对「魂斗罗」这种精确输入反而会带出一堆噪音。
 * 先精确后模糊，结果的可预期性好得多。
 */
const fuse = new Fuse(GAMES, {
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
})

function sortGames(list: Game[], sort: SortKey, recentOrder: Map<string, number>): Game[] {
  const out = [...list]
  switch (sort) {
    case 'year':
      // 没有年份的排在最后，而不是当成 0 顶到最前
      return out.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title, 'zh-Hans-CN'))
    case 'size':
      return out.sort((a, b) => b.bytes - a.bytes)
    case 'recent':
      return out.sort((a, b) => (recentOrder.get(b.id) ?? 0) - (recentOrder.get(a.id) ?? 0))
    case 'title':
    default:
      return out.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
  }
}

export function useGameSearch(search: LibrarySearch, extraGames: Game[] = []) {
  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)

  const pool = useMemo(
    () => (extraGames.length ? [...extraGames, ...GAMES] : GAMES),
    [extraGames],
  )

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

    // 搜索时按相关度（Fuse 顺序 / 命中位置）排，不要被字母序打乱
    if (q && search.sort === 'title') {
      return [...list].sort((a, b) => a.haystack.indexOf(q) - b.haystack.indexOf(q))
    }
    return sortGames(list, search.sort, recentOrder)
  }, [pool, search.q, search.cat, search.fav, search.sort, favorites, recentOrder])
}
