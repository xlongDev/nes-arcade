/**
 * 把「机器扫描结果」「人工元数据」「拼音索引」三份数据合并成 UI 消费的最终模型。
 * 合并在模块加载时一次性完成（85 条，成本可忽略），下游全部拿现成的 Game[]。
 */
import type { Game, GeneratedGame, Category } from '@/types/game'
import generated from './games.generated.json'
import pinyinMap from './pinyin.generated.json'
import { GAME_META } from './games.meta'

type PinyinEntry = { full: string; initials: string }
const PINYIN = pinyinMap as Record<string, PinyinEntry | undefined>

/** 没写元数据的游戏兜底，不至于让卡片开天窗 */
const FALLBACK = {
  category: 'action' as Category,
  players: 1 as const,
  desc: '经典 FC 游戏，插卡即玩。',
}

export const GAMES: Game[] = (generated as GeneratedGame[])
  .map((g): Game => {
    const meta = GAME_META[g.title]
    const py = PINYIN[g.title]
    const alias = meta?.alias ?? []
    const pinyin = py?.full ?? ''
    const initials = py?.initials ?? ''

    return {
      ...g,
      category: meta?.category ?? FALLBACK.category,
      ...(meta?.year !== undefined ? { year: meta.year } : {}),
      players: meta?.players ?? FALLBACK.players,
      desc: meta?.desc ?? FALLBACK.desc,
      alias,
      featured: meta?.featured ?? false,
      pinyin,
      initials,
      haystack: [g.title, pinyin, initials, ...alias].join(' ').toLowerCase(),
    }
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))

export const GAMES_BY_ID = new Map(GAMES.map((g) => [g.id, g]))

export function getGame(id: string | undefined): Game | undefined {
  return id ? GAMES_BY_ID.get(id) : undefined
}

/** 每个分类下的游戏数，用于筛选条上的角标 */
export const CATEGORY_COUNTS: Record<string, number> = GAMES.reduce<Record<string, number>>(
  (acc, g) => {
    acc[g.category] = (acc[g.category] ?? 0) + 1
    acc.all = (acc.all ?? 0) + 1
    return acc
  },
  {},
)

export const FEATURED = GAMES.filter((g) => g.featured)

export const TOTAL_BYTES = GAMES.reduce((s, g) => s + g.bytes, 0)
