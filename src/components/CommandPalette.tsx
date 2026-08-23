import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import type { Category, Game } from '@/types/game'
import { GAMES } from '@/data/games'
import { CATEGORIES } from '@/data/games.meta'
import { useLibrary } from '@/stores/library'
import { formatBytes } from '@/lib/format'
import { cx } from '@/lib/cx'
import { IconSearch, IconPlay, IconArrowUp, IconArrowDown } from '@/components/ui/Icons'

const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]))

/** 面板里用到的精简游戏结构（内置 + 上传混排，带统一检索串） */
interface PaletteGame {
  id: string
  title: string
  category: Category
  year?: number
  bytes: number
  isCustom: boolean
  search: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

/**
 * ⌘K 命令面板：一个居中玻璃对话框，输入即筛选全部游戏（标题 / 拼音 / 首字母 / 别名 / 描述），
 * 方向键选、回车直接进游戏。与 GlobalSearch 定位不同 —— 那是「就地过滤库」，这是「全局快跳」。
 *
 * 视觉与 GlassDialog / CardQuickMenu 同一套：dialog-scrim + dialog-panel 入场、reduced-motion 全局降级。
 * 打开时给 <html> 打 data-cp-open 标记，让 GlobalSearch 的「/ 聚焦」让位给面板输入框，避免抢焦点。
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const customGames = useLibrary((s) => s.customGames)
  const favorites = useLibrary((s) => s.favorites)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 全部可跳转的游戏：内置 GAMES + 本地上传，混排后各自拼出统一检索串
  const all = useMemo<PaletteGame[]>(() => {
    const builtins: PaletteGame[] = (GAMES as Game[]).map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      year: g.year,
      bytes: g.bytes,
      isCustom: false,
      search: [g.title, g.pinyin, g.initials, (g.alias ?? []).join(' '), g.desc]
        .join(' ')
        .toLowerCase(),
    }))
    const custom: PaletteGame[] = customGames.map((c) => ({
      id: c.id,
      title: c.title,
      category: (c.category ?? 'action') as Category,
      year: undefined,
      bytes: c.bytes,
      isCustom: true,
      search: c.title.toLowerCase(),
    }))
    return [...builtins, ...custom]
  }, [customGames])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? all.filter((g) => g.search.includes(q)) : all
    return list.slice(0, 8)
  }, [all, query])

  // 打开即聚焦输入框 + 复位，并打标记让 GlobalSearch 的 / 让位
  useEffect(() => {
    if (!open) return
    document.documentElement.dataset.cpOpen = 'true'
    setQuery('')
    setActive(0)
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      delete document.documentElement.dataset.cpOpen
      cancelAnimationFrame(raf)
    }
  }, [open])

  // 检索词变化时把高亮项夹回有效范围
  useEffect(() => {
    setActive((a) => (a >= results.length ? 0 : a))
  }, [results.length])

  // 高亮项滚入可视区
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  // Esc 关闭（输入框里也能接）
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  const go = (g?: PaletteGame) => {
    const target = g ?? results[active]
    if (!target) return
    onClose()
    void navigate({ to: '/play/$gameId', params: { gameId: target.id } })
  }

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go()
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]">
      {/* 半透明遮罩，点它关 */}
      <div
        aria-hidden
        className="dialog-scrim absolute inset-0 bg-[color-mix(in_srgb,var(--bg-base)_68%,transparent)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="游戏命令面板"
        className="dialog-panel glass-faux glass-sheen glass-refract relative w-full max-w-[560px] overflow-hidden rounded-[var(--radius-glass-lg)] shadow-[var(--drop-lg)]"
      >
        {/* 搜索行 */}
        <div className="flex items-center gap-3 border-b border-[var(--line-1)] px-4">
          <IconSearch size={18} className="shrink-0 text-[var(--ink-4)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="跳转到游戏…（支持中文 / 拼音 / 英文）"
            autoComplete="off"
            spellCheck={false}
            className={cx(
              'h-14 min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ink-1)]',
              'placeholder:text-[var(--ink-4)]',
              '!outline-0 focus:!outline-0 focus-visible:!outline-0',
              '!ring-0 focus:!ring-0 focus-visible:!ring-0',
              '!shadow-none focus:!shadow-none focus-visible:!shadow-none',
            )}
            style={{ outline: 'none', boxShadow: 'none' }}
          />
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 rounded-md border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] px-1.5 py-px font-mono text-[10.5px] text-[var(--ink-4)] sm:block"
          >
            esc
          </kbd>
        </div>

        {/* 结果列表 */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-[var(--ink-3)]">没有匹配的游戏</p>
          ) : (
            results.map((g, i) => {
              const isActive = i === active
              const isFav = favorites.includes(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(g)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-[var(--radius-glass-md)] px-3 py-2.5 text-left',
                    'transition-colors duration-150',
                    isActive
                      ? 'bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)]'
                      : 'hover:bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)]',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-[var(--radius-glass-xs)] border border-[var(--line-1)]',
                      'bg-[color-mix(in_srgb,var(--ink-1)_5%,transparent)]',
                    )}
                  >
                    <IconPlay size={15} className="text-[var(--ink-2)]" fill="currentColor" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-[var(--ink-1)]">
                        {g.title}
                      </span>
                      {isFav && (
                        <span className="text-[11px] text-[var(--color-rose)]">★</span>
                      )}
                      {g.isCustom && (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] px-1.5 py-px text-[10px] text-[var(--color-brand)]">
                          本地
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--ink-4)]">
                      <span>{CAT_LABEL.get(g.category) ?? g.category}</span>
                      {g.year ? (
                        <>
                          <span>·</span>
                          <span className="tnum">{g.year}</span>
                        </>
                      ) : null}
                      <span>·</span>
                      <span className="tnum">{formatBytes(g.bytes)}</span>
                    </span>
                  </span>
                  {isActive && (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--ink-3)]">
                      <span className="font-mono">↵</span>
                      打开
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-[var(--line-1)] px-4 py-2 text-[11px] text-[var(--ink-4)]">
          <span className="flex items-center gap-1.5">
            <IconArrowUp size={12} />
            <IconArrowDown size={12} />
            切换
          </span>
          <span>
            共 <span className="tnum">{all.length}</span> 款 · ⌘K 开关
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
