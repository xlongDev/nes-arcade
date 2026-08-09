export type Category =
  | 'action'
  | 'shooter'
  | 'fighting'
  | 'puzzle'
  | 'sports'
  | 'rpg'
  | 'board'
  | 'multicart'

export type CategoryFilter = Category | 'all'

/** 人工整理的元数据 */
export interface GameMeta {
  category: Category
  /** 首发年份，拿不准就不填 */
  year?: number
  players?: 1 | 2 | 4
  desc: string
  /** 英文名 / 别名，参与搜索与封面匹配 */
  alias?: string[]
  featured?: boolean
}

/** scan-roms.mjs 从 iNES 头解析出的机器元数据 */
export interface GeneratedGame {
  id: string
  title: string
  /** 相对 base 的 ROM 路径，已 URL 编码 */
  file: string
  fileName: string
  bytes: number
  cover: string | null
  mapper: number
  prgKb: number
  chrKb: number
  hasBattery: boolean
  hasTrainer: boolean
  mirroring: 'horizontal' | 'vertical'
  format: 'iNES' | 'NES2.0'
}

/** 合并后供 UI 消费的完整模型 */
export interface Game extends GeneratedGame {
  category: Category
  year?: number
  players: 1 | 2 | 4
  desc: string
  alias: string[]
  featured: boolean
  /** 拼音全拼，如 chaojimali */
  pinyin: string
  /** 拼音首字母，如 cjml */
  initials: string
  /** 预拼接的搜索文本，避免运行时反复拼字符串 */
  haystack: string
  /** 用户上传的临时游戏（不落 games.generated.json） */
  isCustom?: boolean
}

/** 用户上传的本地 ROM */
export interface CustomGame {
  id: string
  title: string
  bytes: number
  addedAt: number
  mapper: number
  /** 上传时按 ROM 的 CRC32 反查 libretro 题材库得到的分类；旧数据可能缺省，消费处兜底 action */
  category: Category
}

/** NES 手柄的逻辑按键 */
export type NesButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'select' | 'start'

/** 键盘映射：KeyboardEvent.code -> 按键 */
export type KeyMap = Record<string, NesButton>

/** 存档槽 */
export interface SaveSlot {
  gameId: string
  slot: number
  createdAt: number
  bytes: number
  /** dataURL 缩略图 */
  thumbnail?: string
}

export interface RecentEntry {
  gameId: string
  playedAt: number
  /** 累计游玩秒数 */
  seconds: number
}
