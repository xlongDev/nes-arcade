/**
 * ROM 自动分类器。
 *
 * 1. 优先用 CRC32 反查 libretro genre 数据库（最准确）。
 * 2. CRC 未命中时（常见于汉化版、修正版、不同 dump），用文件名关键词启发式兜底。
 * 3. 都没命中则返回 'action'。
 */
import type { Category } from '@/types/game'
import { crc32 } from './crc32'
import { NES_GENRE_BY_CRC } from '@/data/nes-genre'
import { classifyByTitle } from './romTitleClassifier'

/** 检测合法 NES 文件的 16 字节 iNES 头 */
function hasNesHeader(buf: Uint8Array): boolean {
  return buf[0] === 0x4e && buf[1] === 0x45 && buf[2] === 0x53 && buf[3] === 0x1a
}

export function classifyRom(title: string, buf: Uint8Array): Category {
  // 1. CRC32 整文件匹配
  const full = crc32(buf)
  if (NES_GENRE_BY_CRC[full]) return NES_GENRE_BY_CRC[full]!

  // 2. CRC32 去 iNES 头匹配（No-Intro 部分 NES dump 去头）
  if (hasNesHeader(buf) && buf.length > 16) {
    const headless = crc32(buf.subarray(16))
    if (NES_GENRE_BY_CRC[headless]) return NES_GENRE_BY_CRC[headless]!
  }

  // 3. 文件名关键词兜底
  return classifyByTitle(title)
}
