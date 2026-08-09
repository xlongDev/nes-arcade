/**
 * 人工整理的游戏元数据。
 * 与机器生成的 games.generated.json 按 title 做键关联 —— 重新扫描 ROM 不会覆盖这里。
 * 年份/厂商只在确切可考时填写，拿不准的宁可留空，也不编造。
 *
 * 本仓库默认不含任何游戏：克隆后游戏库为空，需要你自行提供 ROM
 * （网页上传，或把 .nes 丢进 ../roms/ 后跑 `npm run prepare:data`）。
 * 因此这里默认是空对象；如果你要批量收录自己的收藏并补充中文简介，
 * 可以在此逐条添加，键名需与 ROM 解析出的 title 一致。
 */
import type { Category, GameMeta } from '@/types/game'

export const CATEGORIES = [
  { id: 'all', label: '全部', icon: '◈' },
  { id: 'action', label: '动作冒险', icon: '⚔' },
  { id: 'shooter', label: '射击', icon: '✦' },
  { id: 'fighting', label: '格斗清关', icon: '✊' },
  { id: 'puzzle', label: '益智休闲', icon: '◑' },
  { id: 'sports', label: '体育竞速', icon: '⚑' },
  { id: 'rpg', label: '角色扮演', icon: '✦' },
  { id: 'board', label: '棋牌策略', icon: '⬢' },
  { id: 'multicart', label: '多合一', icon: '⧉' },
] as const satisfies readonly { id: Category | 'all'; label: string; icon: string }[]

export const GAME_META: Record<string, GameMeta> = {}
