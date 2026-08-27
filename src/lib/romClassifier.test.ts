import { describe, it, expect } from 'vitest'
import { classifyRom } from './romClassifier'
import { classifyByTitle } from './romTitleClassifier'

describe('classifyByTitle', () => {
  it('maps known titles to categories', () => {
    expect(classifyByTitle('魂斗罗')).toBe('shooter')
    expect(classifyByTitle('俄罗斯方块')).toBe('puzzle')
    expect(classifyByTitle('超级马里奥')).toBe('action')
  })

  it('normalizes suffixes and brackets before matching', () => {
    expect(classifyByTitle('魂斗罗 (U) [!].nes')).toBe('shooter')
  })

  it('falls back to action for unknown titles', () => {
    expect(classifyByTitle('某不知名游戏')).toBe('action')
  })
})

describe('classifyRom', () => {
  it('falls back to title heuristic when CRC is not in genre db', () => {
    // 随机字节的 CRC 不会命中 libretro 题材库，应回落到标题分类
    const buf = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])
    expect(classifyRom('魂斗罗', buf)).toBe('shooter')
  })

  it('handles an iNES-headed buffer without throwing', () => {
    const header = new Uint8Array([0x4e, 0x45, 0x53, 0x1a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const body = new Uint8Array([9, 8, 7, 6])
    const buf = new Uint8Array([...header, ...body])
    expect(classifyRom('俄罗斯方块', buf)).toBe('puzzle')
  })
})
