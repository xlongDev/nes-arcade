import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLibrary } from '@/stores/library'
import { writeCustomRom } from '@/lib/storage'
import { toast } from '@/components/ui/Toast'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { IconUpload, IconPlay, IconTrash, IconGamepad } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'
import { formatBytes, formatRelative } from '@/lib/format'
import type { CustomGame } from '@/types/game'

interface ParsedRom {
  mapper: number
  prgKb: number
  chrKb: number
  hasBattery: boolean
  mirroring: 'horizontal' | 'vertical'
}

/** 解析 iNES / NES2.0 文件头，校验合法性并取出技术信息。 */
function parseNesHeader(buf: Uint8Array): ParsedRom | null {
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

function titleFromFileName(name: string): string {
  return name.replace(/\.nes$/i, '').replace(/[_-]+/g, ' ').trim() || '未命名卡带'
}

export function UploadPage() {
  const navigate = useNavigate()
  const customGames = useLibrary((s) => s.customGames)
  const addCustomGame = useLibrary((s) => s.addCustomGame)
  const removeCustomGame = useLibrary((s) => s.removeCustomGame)
  const recents = useLibrary((s) => s.recents)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!/\.nes$/i.test(file.name)) {
        toast.error('请选择 .nes 格式的 ROM 文件')
        return
      }
      setBusy(true)
      try {
        const buf = new Uint8Array(await file.arrayBuffer())
        const parsed = parseNesHeader(buf)
        if (!parsed) {
          toast.error('这不是有效的 NES ROM 文件')
          return
        }
        const id = `custom-${crypto.randomUUID()}`
        await writeCustomRom(id, buf)
        const meta: CustomGame = {
          id,
          title: titleFromFileName(file.name),
          bytes: file.size,
          addedAt: Date.now(),
          mapper: parsed.mapper,
        }
        addCustomGame(meta)
        toast.success('已加入本地游戏库')
        void navigate({ to: '/play/$gameId', params: { gameId: id } })
      } catch {
        toast.error('读取文件失败，请重试')
      } finally {
        setBusy(false)
      }
    },
    [addCustomGame, navigate],
  )

  const recentCount = (id: string) => recents.find((r) => r.gameId === id)?.playedAt

  return (
    <div className="stack-page max-w-3xl pb-24 pt-10">
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">上传本地 ROM</h1>
        <p className="mt-2 text-[14px] text-[var(--ink-3)]">
          把你自己的 .nes 卡带上传到浏览器本地，即点即玩。ROM 只存在这台设备的 IndexedDB 里，不会上传到任何服务器。
        </p>
      </header>

      {/* 拖拽 / 点击上传 */}
      <GlassPanel
        radius="xl"
        sheen
        className={cx(
          'flex cursor-pointer flex-col items-center gap-4 px-6 py-14 text-center transition-colors',
          dragging ? 'border-[var(--color-brand)]' : 'border-dashed',
        )}
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) void handleFile(f)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".nes,application/octet-stream"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
        <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] text-[var(--color-brand)]">
          <IconUpload size={28} />
        </span>
        <div>
          <p className="text-[15px] font-semibold">{busy ? '正在导入…' : '点击选择，或把文件拖到这里'}</p>
          <p className="mt-1 text-[12px] text-[var(--ink-3)]">支持 .nes · 仅本机可用</p>
        </div>
      </GlassPanel>

      {/* 已上传列表 */}
      <section className="mt-9">
        <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
          <IconGamepad size={15} /> 我的卡带（{customGames.length}）
        </h2>
        {customGames.length === 0 ? (
          <p className="rounded-[var(--radius-glass-md)] border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_4%,transparent)] px-4 py-6 text-center text-[13px] text-[var(--ink-3)]">
            还没有上传任何 ROM。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customGames.map((g) => (
              <li
                key={g.id}
                className="glass-faux flex items-center gap-3 rounded-[var(--radius-glass-md)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{g.title}</p>
                  <p className="truncate text-[11px] text-[var(--ink-3)]">
                    {formatBytes(g.bytes)} · Mapper {g.mapper}
                    {recentCount(g.id) ? ` · ${formatRelative(recentCount(g.id)!)}玩过` : ''}
                  </p>
                </div>
                <Link to="/play/$gameId" params={{ gameId: g.id }} aria-label={`游玩 ${g.title}`}>
                  <GlassButton variant="primary" size="sm">
                    <IconPlay size={14} /> 游玩
                  </GlassButton>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    removeCustomGame(g.id)
                    toast.success('已移除')
                  }}
                  aria-label={`移除 ${g.title}`}
                  className="grid size-9 place-items-center rounded-full text-[var(--ink-3)] hover:bg-[color-mix(in_srgb,var(--color-rose)_14%,transparent)] hover:text-[var(--color-rose)]"
                >
                  <IconTrash size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
