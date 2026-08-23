/**
 * File System Access API 的最小封装。
 *
 * 这个 API 目前只有 Chromium 系（Chrome / Edge）支持，用来做「目录持久化 + 自动扫描」：
 * 用户授权一次目录句柄后，句柄可以被结构化克隆存进 IndexedDB，之后随时能重新列出目录内容，
 * 实现「设置多目录 + 自动扫描新增 ROM」。
 *
 * 不依赖具体 lib.dom 版本，边界处用最小类型收敛，避免不同 TS 环境下类型缺失导致编译失败。
 */

/** 目录里的条目（文件或子目录） */
export interface DirEntry {
  kind: 'file' | 'directory'
  name: string
  /** 文件条目才有 */
  getFile?: () => Promise<File>
  /** 目录条目才有，用于递归遍历 */
  values?: () => AsyncIterable<DirEntry>
}

/** 目录句柄 */
export interface DirHandle {
  name: string
  values: () => AsyncIterable<DirEntry>
}

/** 浏览器是否支持 File System Access API（Chromium 系为 true） */
export function hasFsAccessApi(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * 弹出目录选择框，返回目录句柄；用户取消或不可用都返回 null。
 * 句柄可结构化克隆，长期留在 IndexedDB 里供后续自动扫描。
 */
export async function pickDirectory(): Promise<DirHandle | null> {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<unknown>
    }
  ).showDirectoryPicker
  if (!picker) return null
  try {
    return (await picker({ mode: 'read' })) as unknown as DirHandle
  } catch {
    // 用户取消（AbortError）属于正常中断，统一返回 null
    return null
  }
}
