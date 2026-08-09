/**
 * 程序化封面：标题 → 确定性配色。
 *
 * 封面策略三层递进：
 *   1. 程序化玻璃封面（本文件）—— 零图片请求，永不缺图
 *   2. 游玩 10 秒自动截图替换 —— 用真实画面覆盖
 *   3. 手动上传 —— 终极兜底
 * 同一个标题永远得到同一套颜色，刷新不会变脸。
 */
import type { Category } from '@/types/game'

/** FNV-1a：短字符串够用，且分布均匀 */
export function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 分类基准色相，让同类游戏在视觉上成组 */
const CATEGORY_HUE: Record<Category, number> = {
  action: 14,
  shooter: 214,
  fighting: 342,
  puzzle: 158,
  sports: 40,
  rpg: 268,
  board: 190,
  multicart: 318,
}

export interface CoverPalette {
  from: string
  to: string
  accent: string
  hue: number
}

/**
 * 在分类色相附近做 ±26° 抖动 —— 既保持分类可辨识，
 * 又让同一分类的几十张卡片不至于糊成一片。
 */
export function coverPalette(title: string, category: Category): CoverPalette {
  const h = hashString(title)
  const base = CATEGORY_HUE[category]
  const hue = (base + (((h >>> 3) % 53) - 26) + 360) % 360
  const hue2 = (hue + 34 + ((h >>> 11) % 40)) % 360
  const sat = 62 + ((h >>> 17) % 22)

  return {
    hue,
    from: `oklch(0.62 0.17 ${hue})`,
    to: `oklch(0.44 0.14 ${hue2})`,
    accent: `hsl(${hue2} ${sat}% 72%)`,
  }
}

/** 取标题里最有辨识度的 1–2 个字符作为封面主字形 */
export function coverGlyph(title: string): string {
  const cleaned = title.replace(/[\s_·-]/g, '')
  const han = cleaned.match(/[\u4e00-\u9fa5]/g)
  if (han && han.length) {
    return han.length >= 2 ? `${han[0]}${han[1]}` : (han[0] as string)
  }
  const latin = cleaned.match(/[A-Za-z0-9]/g)
  if (latin && latin.length) return latin.slice(0, 2).join('').toUpperCase()
  return cleaned.slice(0, 2) || '??'
}

/**
 * 用哈希生成一个 5×5 对称点阵（像素画风格的"卡带贴纸"）。
 * 左右镜像让图案看起来像有意设计，而不是随机噪点。
 */
export function coverPixels(title: string): boolean[] {
  const h = hashString(title + '::px')
  const cells: boolean[] = Array.from({ length: 25 }, () => false)
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const bit = (h >>> (y * 3 + x)) & 1
      const on = bit === 1
      cells[y * 5 + x] = on
      cells[y * 5 + (4 - x)] = on
    }
  }
  return cells
}
