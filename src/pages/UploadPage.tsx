import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLibrary } from '@/stores/library'
import { usePrefs } from '@/stores/prefs'
import {
  deleteCustomRom,
  listDirSources,
  type DirSource,
} from '@/lib/storage'
import {
  scanFileList,
  persistScanRoms,
} from '@/lib/romScanner'
import {
  addDirectorySource,
  rescanSource,
  removeDirectorySource,
  hasFsAccessApi,
} from '@/lib/dirSources'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Toggle } from '@/components/ui/Toggle'
import {
  IconUpload,
  IconPlay,
  IconTrash,
  IconGamepad,
  IconSparkle,
  IconFolder,
  IconFolderPlus,
  IconRefresh,
} from '@/components/ui/Icons'
import { cx } from '@/lib/cx'
import { formatBytes, formatRelative } from '@/lib/format'
import { coverPalette, coverGlyph } from '@/lib/cover'
import type { CustomGame } from '@/types/game'

/**
 * 卡带缩略图。
 * 复用游戏库的程序化配色（同一个标题永远同一个颜色），
 * 这样上传列表和游戏库卡片是同一套视觉语言，不会看着像两个产品。
 */
function CartThumb({ title }: { title: string }) {
  const palette = coverPalette(title, 'multicart')
  return (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[13px] font-bold tracking-tight text-white/95"
      style={{
        background: `linear-gradient(150deg, ${palette.from}, ${palette.to})`,
        boxShadow: 'var(--bevel-soft)',
      }}
    >
      {coverGlyph(title)}
    </span>
  )
}

/* ----------------------------- 文件夹拖拽收集 ----------------------------- */

interface FsEntry {
  isFile: boolean
  isDirectory: boolean
  name: string
  file: (cb: (f: File) => void, err?: (e: unknown) => void) => void
  createReader: () => { readEntries: (cb: (es: FsEntry[]) => void, err?: (e: unknown) => void) => void }
}

function readEntry(entry: FsEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) =>
      entry.file((f) => resolve([f]), () => resolve([])),
    )
  }
  if (entry.isDirectory) {
    const reader = entry.createReader()
    const out: File[] = []
    const readBatch = () =>
      new Promise<FsEntry[]>((resolve, reject) =>
        reader.readEntries((es) => resolve(es), (e) => reject(e)),
      )
    return (async () => {
      for (;;) {
        const batch = await readBatch()
        if (!batch.length) break
        const nested = await Promise.all(batch.map(readEntry))
        nested.forEach((f) => out.push(...f))
      }
      return out
    })().catch(() => out)
  }
  return Promise.resolve([])
}

/** 从拖拽的 DataTransfer 里收集所有 .nes 文件，能递归展开拖入的文件夹 */
async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = dt.items
  if (items && items.length && typeof (items[0] as unknown as { webkitGetAsEntry?: unknown }).webkitGetAsEntry === 'function') {
    const entries = Array.from(items)
      .map((it) => (it as unknown as { webkitGetAsEntry: () => FsEntry | null }).webkitGetAsEntry())
      .filter((e): e is FsEntry => Boolean(e))
    const all = await Promise.all(entries.map(readEntry))
    return all.flat()
  }
  return Array.from(dt.files)
}

/* ----------------------------- 页面 ----------------------------- */

export function UploadPage() {
  const navigate = useNavigate()
  const customGames = useLibrary((s) => s.customGames)
  const addCustomGames = useLibrary((s) => s.addCustomGames)
  const removeCustomGame = useLibrary((s) => s.removeCustomGame)
  const recents = useLibrary((s) => s.recents)
  const autoScanDirs = usePrefs((s) => s.autoScanDirs)
  const patchPrefs = usePrefs((s) => s.patch)
  const setAutoScanDirs = useCallback((v: boolean) => patchPrefs({ autoScanDirs: v }), [patchPrefs])

  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [scanningId, setScanningId] = useState<string | null>(null)

  const [dirSources, setDirSources] = useState<DirSource[]>([])
  const refreshDirs = useCallback(() => {
    void listDirSources().then(setDirSources)
  }, [])
  useEffect(() => {
    refreshDirs()
  }, [refreshDirs])

  // 拖拽计数：子元素间移动也会触发 dragleave，只靠布尔量会疯狂闪烁
  const dragDepth = useRef(0)

  /** 把一批 File 扫描、入库、反馈。单文件时自动跳到游玩页。 */
  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || importing) return
      setImporting(true)
      try {
        const result = await scanFileList(files)
        if (result.roms.length) {
          await persistScanRoms(result)
          addCustomGames(result.games)
        }
        const ok = result.games.length
        const bad = result.errors
        const skip = result.skipped
        if (ok === 0) {
          toast.error(bad > 0 ? '文件里没有有效的 NES ROM' : '没有找到 .nes 文件')
        } else if (ok === 1) {
          toast.success('已加入本地游戏库')
          void navigate({ to: '/play/$gameId', params: { gameId: result.games[0]!.id } })
        } else {
          const parts = [`已导入 ${ok} 个 ROM`]
          if (skip) parts.push(`跳过 ${skip} 个`)
          if (bad) parts.push(`${bad} 个无效`)
          toast.success(parts.join('，'))
        }
      } catch (err) {
        console.error('[upload] 批量导入失败:', err)
        toast.error('读取文件失败，请重试')
      } finally {
        setImporting(false)
      }
    },
    [addCustomGames, importing, navigate],
  )

  const handleRemove = useCallback(
    async (game: CustomGame) => {
      const ok = await confirmDialog({
        title: `移除《${game.title}》？`,
        description: '这份 ROM 只存在这台设备上，移除后需要重新上传才能再玩。',
        confirmText: '移除',
        tone: 'danger',
      })
      if (!ok) return

      removeCustomGame(game.id)
      // 元数据先撤，ROM 本体延后删 —— 这样"撤销"才有东西可以恢复
      let undone = false
      toast.withAction(`已移除《${game.title}》`, {
        label: '撤销',
        onClick: () => {
          undone = true
          addCustomGameFromMeta(game)
        },
      })
      setTimeout(() => {
        if (!undone) void deleteCustomRom(game.id)
      }, 6500)
    },
    [addCustomGameFromMeta, removeCustomGame],
  )

  const lastPlayed = (id: string) => recents.find((r) => r.gameId === id)?.playedAt
  const busy = importing

  return (
    <div className="stack-page max-w-3xl pb-24 pt-10">
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">上传本地 ROM</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--ink-3)]">
          把你的 .nes 卡带（可一次选多个，或直接把整个文件夹拖进来）上传到浏览器本地，即点即玩。
          ROM 只存在这台设备的 IndexedDB 里，不会上传到任何服务器。
        </p>
      </header>

      {/* 拖拽 / 点击上传 */}
      <GlassPanel
        radius="xl"
        sheen
        className={cx(
          'relative flex cursor-pointer flex-col items-center gap-4 overflow-hidden px-6 py-14 text-center',
          'transition-[transform,border-color,background-color] duration-200 [transition-timing-function:var(--ease-glass)]',
          dragging
            ? 'scale-[1.015] border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]'
            : 'border-dashed',
          busy && 'pointer-events-none',
        )}
        style={
          dragging
            ? { boxShadow: '0 0 0 1px var(--color-brand), 0 0 60px -12px var(--color-brand)' }
            : undefined
        }
        role="button"
        tabIndex={0}
        aria-label="选择或拖入 NES ROM 文件或文件夹"
        aria-describedby="upload-hint"
        aria-busy={busy}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          // 空格默认会滚动页面，必须拦掉
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setDragging(false)
          }
        }}
        onDrop={async (e) => {
          e.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          const files = await filesFromDataTransfer(e.dataTransfer)
          void importFiles(files)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".nes,application/octet-stream"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            void importFiles(files)
            e.target.value = ''
          }}
        />
        {/* 非 Chromium 浏览器的一次性文件夹导入兜底（不支持持久化目录） */}
        <input
          ref={folderRef}
          type="file"
          className="hidden"
          {...({ webkitdirectory: '', directory: '' } as Record<string, unknown>)}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            void importFiles(files)
            e.target.value = ''
          }}
        />

        <span
          className={cx(
            'grid size-16 place-items-center rounded-full transition-transform duration-300',
            '[transition-timing-function:var(--ease-spring)]',
            'bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] text-[var(--color-brand)]',
            dragging && '-translate-y-1 scale-110',
          )}
        >
          <IconUpload size={28} />
        </span>

        <div>
          <p className="text-[15px] font-semibold">
            {busy ? '正在导入…' : dragging ? '松手就导入' : '点击选择，或把文件 / 文件夹拖到这里'}
          </p>
          <p id="upload-hint" className="mt-1 text-[12px] text-[var(--ink-3)]">
            支持多文件 · 支持整个文件夹 · 仅本机可用
          </p>
        </div>
      </GlassPanel>

      {/* 目录自动扫描 */}
      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[12.5px] font-semibold text-[var(--ink-4)]">
            <IconFolder size={15} className="text-[var(--ink-3)]" /> 目录自动扫描
          </h2>
          <Toggle
            checked={autoScanDirs}
            onChange={setAutoScanDirs}
            label="启动时自动扫描"
            description=""
            disabled={dirSources.length === 0}
          />
        </div>

        <GlassPanel radius="lg" className="p-3">
          {hasFsAccessApi() ? (
            <button
              type="button"
              onClick={async () => {
                const added = await addDirectorySource()
                if (added) refreshDirs()
              }}
              className={cx(
                'flex w-full items-center justify-center gap-2 rounded-[var(--radius-glass-md)] px-4 py-3',
                'border border-dashed border-[var(--line-2)] text-[14px] font-medium text-[var(--ink-2)]',
                'transition-colors duration-150 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
              )}
            >
              <IconFolderPlus size={18} /> 添加游戏目录
            </button>
          ) : (
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              className={cx(
                'flex w-full items-center justify-center gap-2 rounded-[var(--radius-glass-md)] px-4 py-3',
                'border border-dashed border-[var(--line-2)] text-[14px] font-medium text-[var(--ink-2)]',
                'transition-colors duration-150 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
              )}
            >
              <IconFolder size={18} /> 选择文件夹（一次性导入）
            </button>
          )}

          {dirSources.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {dirSources.map((src) => {
                const count = customGames.filter((g) => g.sourceDirId === src.id).length
                const scanning = scanningId === src.id
                return (
                  <li
                    key={src.id}
                    className="glass-faux flex items-center gap-3 rounded-[var(--radius-glass-md)] p-3"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] text-[var(--color-brand)]">
                      <IconFolder size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{src.name}</p>
                      <p className="truncate text-[11px] text-[var(--ink-3)]">
                        {count > 0 ? `${count} 个游戏` : '暂无游戏'}
                        {scanning && ' · 扫描中…'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setScanningId(src.id)
                        try {
                          await rescanSource(src)
                        } finally {
                          setScanningId(null)
                          refreshDirs()
                        }
                      }}
                      disabled={scanning}
                      aria-label={`重新扫描 ${src.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] hover:text-[var(--color-brand)] disabled:opacity-50"
                    >
                      <IconRefresh size={16} className={scanning ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: `移除目录《${src.name}》？`,
                          description: '该目录下的所有游戏与 ROM 都会被删除，但文件夹本身不会被改动。',
                          confirmText: '移除',
                          tone: 'danger',
                        })
                        if (!ok) return
                        await removeDirectorySource(src)
                        refreshDirs()
                      }}
                      aria-label={`移除目录 ${src.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--color-rose)_14%,transparent)] hover:text-[var(--color-rose)]"
                    >
                      <IconTrash size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-[var(--ink-3)]">
            {hasFsAccessApi()
              ? '添加目录后，应用每次启动都会自动扫描其中新增的 .nes 文件并收录。目录句柄仅保存在本机，不会上传。'
              : '当前浏览器不支持目录持久化（需 Chrome / Edge）。已用「选择文件夹」做一次性导入；换成 Chromium 系浏览器即可设置可自动扫描的目录。'}
          </p>
        </GlassPanel>
      </section>

      {/* 已上传列表 */}
      <section className="mt-9 flex max-h-[min(720px,65vh)] flex-col">
        <h2 className="mb-3 flex shrink-0 items-center gap-2 px-1 text-[12.5px] font-semibold text-[var(--ink-4)]">
          <IconGamepad size={15} className="text-[var(--ink-3)]" /> 我的卡带（{customGames.length}）
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {customGames.length === 0 ? (
            <div className="glass-faux flex flex-col items-center gap-3 rounded-[var(--radius-glass-lg)] px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)] text-[var(--ink-3)]">
                <IconSparkle size={22} />
              </span>
              <div>
                <p className="text-[14px] font-semibold">还没有上传任何卡带</p>
                <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  上传后会出现在这里，也会自动收录进游戏库。ROM 全程留在本机，关掉页面也不会丢。
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 pb-2">
              {customGames.map((g, i) => (
                <li
                  key={g.id}
                  style={{ '--i': i } as React.CSSProperties}
                  className={cx(
                    'stagger-in glass-faux glass-faux-hoverable',
                    'flex items-center gap-3 rounded-[var(--radius-glass-md)] p-3',
                    'transition-colors duration-200',
                  )}
                >
                  <CartThumb title={g.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{g.title}</p>
                    <p className="truncate text-[11px] text-[var(--ink-3)]">
                      {formatBytes(g.bytes)} · Mapper {g.mapper}
                      {lastPlayed(g.id) ? ` · ${formatRelative(lastPlayed(g.id)!)}玩过` : ' · 还没玩过'}
                      {g.dirName ? ` · 来自《${g.dirName}》` : ''}
                    </p>
                  </div>
                  <Link to="/play/$gameId" params={{ gameId: g.id }} aria-label={`游玩 ${g.title}`}>
                    <GlassButton variant="glass" size="sm">
                      <IconPlay size={14} /> 游玩
                    </GlassButton>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(g)}
                    aria-label={`移除 ${g.title}`}
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)]',
                      'transition-colors duration-150',
                      'hover:bg-[color-mix(in_srgb,var(--color-rose)_14%,transparent)] hover:text-[var(--color-rose)]',
                    )}
                  >
                    <IconTrash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

/** 撤销移除时，把游戏元数据重新加回（ROM 本体 6.5s 内尚未删除） */
function addCustomGameFromMeta(game: CustomGame) {
  useLibrary.getState().addCustomGame(game)
}
