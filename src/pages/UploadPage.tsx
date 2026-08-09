import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useLibrary } from '@/stores/library'
import { writeCustomRom, deleteCustomRom, genCustomRomId } from '@/lib/storage'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { IconUpload, IconPlay, IconTrash, IconGamepad, IconSparkle } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'
import { formatBytes, formatRelative } from '@/lib/format'
import { coverPalette, coverGlyph } from '@/lib/cover'
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

/** 导入阶段。文案要说人话，别写"processing"。 */
const PHASE_TEXT = {
  reading: '正在读取文件…',
  parsing: '正在校验卡带…',
  saving: '正在写入本地库…',
} as const
type Phase = keyof typeof PHASE_TEXT

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

export function UploadPage() {
  const navigate = useNavigate()
  const customGames = useLibrary((s) => s.customGames)
  const addCustomGame = useLibrary((s) => s.addCustomGame)
  const removeCustomGame = useLibrary((s) => s.removeCustomGame)
  const recents = useLibrary((s) => s.recents)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<Phase | null>(null)

  // 导入通常只要几十毫秒。立刻显示进度反而是一次闪烁，
  // 所以延后 160ms —— 快的时候用户什么都看不到，慢的时候才有反馈。
  const [showPhase, setShowPhase] = useState(false)
  useEffect(() => {
    if (!phase) {
      setShowPhase(false)
      return
    }
    const t = setTimeout(() => setShowPhase(true), 160)
    return () => clearTimeout(t)
  }, [phase])

  // 拖拽计数：子元素间移动也会触发 dragleave，只靠布尔量会疯狂闪烁
  const dragDepth = useRef(0)

  const handleFile = useCallback(
    async (file: File) => {
      if (!/\.nes$/i.test(file.name)) {
        toast.error('请选择 .nes 格式的 ROM 文件')
        return
      }
      setPhase('reading')
      try {
        const buf = new Uint8Array(await file.arrayBuffer())

        setPhase('parsing')
        const parsed = parseNesHeader(buf)
        if (!parsed) {
          toast.error('这不是有效的 NES ROM 文件')
          return
        }

        setPhase('saving')
        const id = genCustomRomId()
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
      } catch (err) {
        // 真实错误打到控制台，方便排障；用户侧仍给友好的通用提示
        console.error('[upload] 导入 ROM 失败:', err)
        toast.error('读取文件失败，请重试')
      } finally {
        setPhase(null)
      }
    },
    [addCustomGame, navigate],
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
          addCustomGame(game)
        },
      })
      setTimeout(() => {
        if (!undone) void deleteCustomRom(game.id)
      }, 6500)
    },
    [addCustomGame, removeCustomGame],
  )

  const lastPlayed = (id: string) => recents.find((r) => r.gameId === id)?.playedAt
  const busy = phase !== null

  return (
    <div className="stack-page max-w-3xl pb-24 pt-10">
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">上传本地 ROM</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--ink-3)]">
          把你自己的 .nes 卡带上传到浏览器本地，即点即玩。ROM 只存在这台设备的 IndexedDB
          里，不会上传到任何服务器。
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
        aria-label="选择或拖入 NES ROM 文件"
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
        onDrop={(e) => {
          e.preventDefault()
          dragDepth.current = 0
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
            {showPhase && phase
              ? PHASE_TEXT[phase]
              : dragging
                ? '松手就导入'
                : '点击选择，或把文件拖到这里'}
          </p>
          <p id="upload-hint" className="mt-1 text-[12px] text-[var(--ink-3)]">
            支持 .nes · 仅本机可用
          </p>
        </div>

        {/* 导入中的流动进度条。是"不确定进度"，所以不谎报百分比。 */}
        {showPhase && (
          <span
            aria-hidden="true"
            className="shimmer absolute inset-x-0 bottom-0 h-[3px] bg-[color-mix(in_srgb,var(--color-brand)_35%,transparent)]"
          />
        )}
      </GlassPanel>

      {/* 已上传列表 */}
      <section className="mt-9">
        <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
          <IconGamepad size={15} /> 我的卡带（{customGames.length}）
        </h2>

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
          <ul className="flex flex-col gap-2">
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
                  </p>
                </div>
                <Link to="/play/$gameId" params={{ gameId: g.id }} aria-label={`游玩 ${g.title}`}>
                  <GlassButton variant="primary" size="sm">
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
      </section>
    </div>
  )
}
