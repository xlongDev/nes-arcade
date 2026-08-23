/**
 * 游戏目录源管理 + 自动扫描。
 *
 * 用户可添加多个本地文件夹作为「游戏目录」。Chromium 系浏览器下，目录句柄会被持久化到
 * IndexedDB，应用启动时自动重新扫描这些文件夹，把新增的 .nes 收录进本地游戏库——这就是
 * 需求里的「自定义指定游戏目录自动扫描添加游戏，支持设置多目录」。
 *
 * 非 Chromium 浏览器（Safari / Firefox）不支持 File System Access API，目录无法持久化，
 * 此时由 UploadPage 用 <input webkitdirectory> 做一次性文件夹导入兜底。
 */
import {
  listDirSources,
  addDirSource,
  removeDirSource,
  type DirSource,
} from '@/lib/storage'
import { scanDirectory, persistScanRoms } from '@/lib/romScanner'
import { pickDirectory, hasFsAccessApi, type DirHandle } from '@/lib/fs-access'
import { useLibrary } from '@/stores/library'
import { usePrefs } from '@/stores/prefs'
import { toast } from '@/components/ui/Toast'

export { hasFsAccessApi }

let autoScanFired = false

/** 某个目录下，当前已收录游戏的去重键集合（用于扫描时跳过，保证幂等） */
function existingKeysFor(dirId: string): Set<string> {
  return new Set(
    useLibrary
      .getState()
      .customGames.filter((g) => g.sourceDirId === dirId && g.sourceKey)
      .map((g) => g.sourceKey as string),
  )
}

/** 扫描单个目录源并把新游戏入库，返回新增数量 */
async function scanAndCommit(src: DirSource, handle: DirHandle): Promise<number> {
  const result = await scanDirectory(
    handle,
    src.id,
    src.name,
    existingKeysFor(src.id),
  )
  if (result.roms.length) await persistScanRoms(result)
  if (result.games.length) useLibrary.getState().addCustomGames(result.games)
  return result.games.length
}

/** 弹出目录选择框并添加为游戏目录，立即扫描一次 */
export async function addDirectorySource(): Promise<boolean> {
  const handle = await pickDirectory()
  if (!handle) return false
  const src: DirSource = {
    id: `dir-${handle.name}-${Date.now()}`,
    name: handle.name,
    addedAt: Date.now(),
    handle,
  }
  await addDirSource(src)
  let added = 0
  try {
    added = await scanAndCommit(src, handle)
  } catch (err) {
    console.error('[dirs] 首次扫描目录失败:', err)
  }
  toast.success(
    added > 0
      ? `已添加目录《${src.name}》，导入 ${added} 个游戏`
      : `已添加目录《${src.name}》（未找到 .nes 文件）`,
  )
  return true
}

/** 手动重新扫描某个目录 */
export async function rescanSource(src: DirSource): Promise<void> {
  const handle = src.handle as unknown as DirHandle
  try {
    const n = await scanAndCommit(src, handle)
    toast.success(n > 0 ? `扫描完成，新增 ${n} 个游戏` : '没有发现新的游戏')
  } catch (err) {
    console.error('[dirs] 重新扫描失败:', err)
    toast.error('无法访问该目录，请在浏览器弹窗中重新授权')
  }
}

/** 移除某个目录源，并连带删除其下所有已收录的游戏与 ROM */
export async function removeDirectorySource(src: DirSource): Promise<void> {
  useLibrary.getState().removeDirGames(src.id)
  await removeDirSource(src.id)
}

/**
 * 应用启动时调用一次：自动扫描所有已授权目录，把新增 ROM 收录进库。
 * 目录若失去授权，handle.values() 会抛错，这里静默跳过（用户可在 UI 手动重新扫描）。
 */
export async function autoScanDirs(): Promise<void> {
  if (autoScanFired) return
  autoScanFired = true
  if (!usePrefs.getState().autoScanDirs) return

  let sources: DirSource[] = []
  try {
    sources = await listDirSources()
  } catch (err) {
    console.error('[dirs] 读取目录源失败:', err)
    return
  }
  if (!sources.length) return

  let total = 0
  for (const src of sources) {
    try {
      total += await scanAndCommit(src, src.handle as unknown as DirHandle)
    } catch {
      // 权限不足等，跳过；不放 toast 以免每次启动都打扰用户
    }
  }
  if (total > 0) toast.success(`自动发现 ${total} 个新游戏`)
}
