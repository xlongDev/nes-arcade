import { describe, it, expect } from 'vitest'
import { crc32 } from './crc32'

describe('crc32', () => {
  it('matches the standard CRC-32/IEEE vector for "123456789"', () => {
    // 经典校验向量：CRC-32(IEEE)("123456789") === 0xCBF43926
    expect(crc32(new TextEncoder().encode('123456789'))).toBe('cbf43926')
  })

  it('is deterministic and emits a lowercase 8-hex string', () => {
    const a = crc32(new Uint8Array([1, 2, 3, 4]))
    const b = crc32(new Uint8Array([1, 2, 3, 4]))
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{8}$/)
  })
})
