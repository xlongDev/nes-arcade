import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import type { Game } from '@/types/game'
import { useLibrary } from '@/stores/library'
import { CATEGORIES } from '@/data/games.meta'
import { formatBytes, mapperName } from '@/lib/format'
import { cx } from '@/lib/cx'
import { IconClose, IconHeart, IconPlay, IconCopy } from '@/components/ui/Icons'

const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]))

interface CardQuickMenuProps {
  game: Game
  open: boolean
  /** 长按 / 右键时的 client 坐标,作为 popover 锚点 */
  anchor: { x: number; y: number } | null
  onClose: () => void
}

/**
 * 长按 / 右键卡片弹出的快速菜单。
 *
 * 比 GlassDialog 轻 —— 没有 backdrop-filter 锁屏,没有焦点陷阱,只做三件事:
 *  - 透明 backdrop 接 outside-click(不锁滚动,菜单之外还能刷页)
 *  - Esc 关闭并把焦点还给卡片链接
 *  - 锚点 anchor 出视口时自动 clamp,避免贴近屏幕边缘被裁
 *
 * 动效一律走 glass.css 里的 .dialog-panel;reduced-motion 由全局兜底降级。
 */
export function CardQuickMenu({ game, open, anchor, onClose }: CardQuickMenuProps) {
  const navigate = useNavigate()
  const favorite = useLibrary((s) => s.favorites.includes(game.id))
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)

  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // 用 layout effect 在绘制前定位置;若需要 clamp 也一并算好
  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPos(null)
      return
    }
    const panel = panelRef.current
    if (!panel) return
    // 先放到 offscreen 让浏览器测量真实尺寸
    panel.style.left = '-9999px'
    panel.style.top = '-9999px'
    const rect = panel.getBoundingClientRect()
    const vw = window.innerWidth
    const margin = 12
    let left = anchor.x
    let top = anchor.y
    // 默认在锚点上方(panel 底在 top 处,上 12px 间距)
    let placeAbove = true
    if (top - rect.height - 12 < margin) {
      placeAbove = false
    }
    // 水平 clamp:让 panel 中心对齐 anchor.x
    if (left - rect.width / 2 < margin) left = rect.width / 2 + margin
    else if (left + rect.width / 2 > vw - margin) left = vw - rect.width / 2 - margin
    // 垂直:放在锚点上方(translate -100%)或下方
    const finalTop = placeAbove
      ? top - 12
      : top + 12
    panel.style.left = `${left}px`
    panel.style.top = `${finalTop}px`
    panel.style.transform = `translate(-50%, ${placeAbove ? 'calc(-100% + 0px)' : '0'})`
    setPos({ left, top: finalTop })
  }, [open, anchor])

  // 焦点接管 + Esc
  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]')
      if (target) target.focus({ preventScroll: true })
      else panelRef.current?.focus({ preventScroll: true })
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey, true)
      const el = restoreRef.current
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open || !anchor) return null

  const onPlay = () => {
    onClose()
    void navigate({ to: '/play/$gameId', params: { gameId: game.id } })
  }

  const onCopyLink = async () => {
    onClose()
    try {
      const url = `${window.location.origin}${window.location.pathname}#/play/${game.id}`
      await navigator.clipboard?.writeText(url)
    } catch {
      /* 剪贴板被拒就静默,不影响主流程 */
    }
  }

  const onToggleFav = () => {
    toggleFavorite(game.id)
    onClose()
  }

  const category = CAT_LABEL.get(game.category) ?? game.category
  const metaBits: string[] = [category]
  if (game.year) metaBits.push(String(game.year))
  if (game.mapper || game.mapper === 0) metaBits.push(mapperName(game.mapper))

  return createPortal(
    <>
      {/* 透明 backdrop:不锁滚动,只接 outside-click */}
      <div
        aria-hidden
        className="fixed inset-0 z-[80]"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      />
      <div
        ref={panelRef}
        role="menu"
        aria-label={`${game.title} 快捷操作`}
        tabIndex={-1}
        className={cx(
          'popover-fade glass-faux glass-sheen glass-refract',
          'fixed z-[85] w-[min(280px,calc(100dvw-24px))]',
          'rounded-[var(--radius-glass-md)] p-3 shadow-[var(--drop-lg)] outline-none',
          !pos && 'invisible',
        )}
      >
        {/* 标题区 */}
        <div className="flex items-start justify-between gap-2 px-1 pb-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-tight">
              {game.title}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--ink-3)]">
              {metaBits.join(' · ')}
              <span className="text-[var(--ink-4)]"> · </span>
              <span className="tnum">{formatBytes(game.bytes)}</span>
              {game.isCustom && (
                <>
                  <span className="text-[var(--ink-4)]"> · </span>
                  <span className="text-[var(--color-brand)]">本地上传</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] hover:text-[var(--ink-1)]"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* 操作列表 */}
        <div className="flex flex-col gap-1">
          <MenuItem icon={<IconPlay size={16} />} onClick={onPlay} primary>
            开始游戏
          </MenuItem>
          <MenuItem
            icon={<IconHeart size={16} filled={favorite} />}
            onClick={onToggleFav}
            active={favorite}
            activeTone="rose"
          >
            {favorite ? '已收藏' : '收藏'}
          </MenuItem>
          <MenuItem icon={<IconCopy size={16} />} onClick={onCopyLink}>
            复制分享链接
          </MenuItem>
        </div>
      </div>
    </>,
    document.body,
  )
}

function MenuItem({
  icon,
  active,
  activeTone,
  primary,
  onClick,
  children,
}: {
  icon: React.ReactNode
  active?: boolean
  activeTone?: 'rose'
  primary?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      data-autofocus={primary ? '' : undefined}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-[var(--radius-glass-xs)] px-3 py-2',
        'text-left text-[13.5px] transition-colors duration-200',
        'hover:bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)]',
        primary && 'font-semibold',
        active && activeTone === 'rose' && 'text-[var(--color-rose)]',
        !active && 'text-[var(--ink-1)]',
      )}
    >
      <span className="text-[var(--ink-2)]">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
    </button>
  )
}
