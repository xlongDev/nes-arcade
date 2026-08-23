/**
 * ROM 扫描核心。
 *
 * 把「单个文件 / 整个文件夹 / 一个目录句柄」统一收敛成同一份产物 ScanResult：
 *   - games：要写进游戏库的元数据
 *   - roms：要写进 IndexedDB 的二进制本体
 *   - errors / skipped：给用户看的统计
 *
 * 这样无论是「多选上传」「拖文件夹」还是「目录自动扫描」，下游的入库逻辑都只用一份。
 */
import type { CustomGame } from '@/types/game'
import { genCustomRomId, writeCustomRomsBatch } from '@/lib/storage'
import { classifyRom } from '@/lib/romClassifier'
import type { DirHandle } from '@/lib/fs-access'

interface ParsedRom {
  mapper: number
  prgKb: number
  chrKb: number
  hasBattery: boolean
  mirroring: 'horizontal' | 'vertical'
}

/** 解析 iNES / NES2.0 文件头，校验合法性并取出 mapper 等技术信息 */
export function parseNesHeader(buf: Uint8Array): ParsedRom | null {
  if (buf[0] !== 0x4e || buf[1] !== 0x45 || buf[2] !== 0x53 || buf[3] !== 0x1a) return null
  const flags6 = buf[6] ?? 0
  const flags7 = buf[7] ?? 0
  return {
    mapper: (flags7 & 0xf0) | (flags6 >> 4),
    prgKb: (buf[4] ?? 0) * 16,
    chrKb: (buf[5] ?? 0) * 8,
    hasBattery: (flags6 & 0x02) !== 0,
    mirroring: (flags6 & 0x01) ? 'vertical' : 'horizontal',
  }
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.nes$/i, '').replace(/[_-]+/g, ' ').trim() || '未命名卡带'
}

/** 生成去重键：上传用文件名+大小，目录用「目录id + 相对路径 + 大小」，保证重扫幂等 */
export function sourceKeyFor(kind: 'upload' | 'dir', parts: string[]): string {
  return [kind, ...parts].join('::')
}

export interface ScanRom {
  id: string
  data: Uint8Array
}

export interface ScanResult {
  games: CustomGame[]
  roms: ScanRom[]
  errors: number
  skipped: number
}

interface BuildOpts {
  title: string
  fileName: string
  bytes: number
  buf: Uint8Array
  sourceKey?: string
  sourceDirId?: string
  dirName?: string
}

/** 解析一份 ROM 字节，产出元数据 + 待存二进制；非法文件返回 null */
async function buildEntry(opts: BuildOpts): Promise<{ game: CustomGame; rom: ScanRom } | null> {
  const parsed = parseNesHeader(opts.buf)
  if (!parsed) return null
  const id = genCustomRomId()
  const game: CustomGame = {
    id,
    title: opts.title,
    bytes: opts.bytes,
    addedAt: Date.now(),
    mapper: parsed.mapper,
    category: classifyRom(opts.fileName, opts.buf),
    ...(opts.sourceKey ? { sourceKey: opts.sourceKey } : {}),
    ...(opts.sourceDirId
      ? { sourceDirId: opts.sourceDirId, dirName: opts.dirName }
      : {}),
  }
  return { game, rom: { id, data: opts.buf } }
}

/** 批量扫描一组 File（来自多选或文件夹拖拽） */
export async function scanFileList(files: File[]): Promise<ScanResult> {
  const res: ScanResult = { games: [], roms: [], errors: 0, skipped: 0 }
  const seen = new Set<string>()
  for (const file of files) {
    if (!/\.nes$/i.test(file.name)) {
      res.skipped++
      continue
    }
    const key = sourceKeyFor('upload', [file.name, String(file.size)])
    if (seen.has(key)) {
      res.skipped++
      continue
    }
    seen.add(key)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const built = await buildEntry({
        title: titleFromFileName(file.name),
        fileName: file.name,
        bytes: file.size,
        buf,
        sourceKey: key,
      })
      if (!built) {
        res.errors++
        continue
      }
      res.games.push(built.game)
      res.roms.push(built.rom)
    } catch {
      res.errors++
    }
  }
  return res
}

/** 递归遍历目录句柄，产出所有 .nes 文件及其相对路径 */
export async function* walkDirectory(
  handle: DirHandle,
): AsyncGenerator<{ file: File; relPath: string }> {
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      if (/\.nes$/i.test(entry.name) && entry.getFile) {
        const file = await entry.getFile()
        yield { file, relPath: entry.name }
      }
    } else if (entry.kind === 'directory' && entry.values) {
      const sub = walkDirectory(entry as unknown as DirHandle)
      for await (const child of sub) {
        yield { file: child.file, relPath: `${entry.name}/${child.relPath}` }
      }
    }
  }
}

/**
 * 扫描单个目录源；existingKeys 用于跳过已收录的游戏，使重新扫描幂等。
 * 注意：目录句柄若失去授权，handle.values() 会抛 SecurityError，由调用方捕获处理。
 */
export async function scanDirectory(
  handle: DirHandle,
  dirId: string,
  dirName: string,
  existingKeys: Set<string>,
): Promise<ScanResult> {
  const res: ScanResult = { games: [], roms: [], errors: 0, skipped: 0 }
  const seen = new Set<string>()
  for await (const { file, relPath } of walkDirectory(handle)) {
    const key = sourceKeyFor('dir', [dirId, relPath, String(file.size)])
    if (existingKeys.has(key) || seen.has(key)) {
      res.skipped++
      continue
    }
    seen.add(key)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const built = await buildEntry({
        title: titleFromFileName(file.name),
        fileName: file.name,
        bytes: file.size,
        buf,
        sourceKey: key,
        sourceDirId: dirId,
        dirName,
      })
      if (!built) {
        res.errors++
        continue
      }
      res.games.push(built.game)
      res.roms.push(built.rom)
    } catch {
      res.errors++
    }
  }
  return res
}

/** 把扫描结果里的 ROM 二进制写入 IndexedDB（元数据由调用方去重后写入 store） */
export async function persistScanRoms(result: ScanResult): Promise<void> {
  if (result.roms.length) await writeCustomRomsBatch(result.roms)
}
