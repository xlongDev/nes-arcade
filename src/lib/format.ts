export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  return `${h} 小时 ${m % 60} 分`
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

/** mapper 号 → 常见名称，游戏详情里显示技术信息用 */
const MAPPER_NAMES: Record<number, string> = {
  0: 'NROM',
  1: 'MMC1',
  2: 'UxROM',
  3: 'CNROM',
  4: 'MMC3',
  7: 'AxROM',
  9: 'MMC2',
  10: 'MMC4',
  11: 'Color Dreams',
  21: 'VRC4a/c',
  23: 'VRC2b/4e',
  24: 'VRC6',
  25: 'VRC4b/d',
  45: 'MMC3 Multicart',
  64: 'RAMBO-1',
  66: 'GxROM',
  67: 'Sunsoft-3',
  68: 'Sunsoft-4',
  69: 'Sunsoft FME-7',
  71: 'Camerica',
  73: 'VRC3',
  87: 'Jaleco',
}

export function mapperName(mapper: number): string {
  return MAPPER_NAMES[mapper] ?? `Mapper ${mapper}`
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
