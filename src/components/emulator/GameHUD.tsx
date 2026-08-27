import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import type { Game } from '@/types/game'
import type { EmulatorApi } from '@/features/emulator/useEmulator'
import { GlassButton } from '@/components/ui/GlassButton'
import { VolumeControl } from '@/components/ui/VolumeControl'
import { useThemeToggle } from '@/lib/useThemeSync'
import { cx } from '@/lib/cx'
import {
  IconBack,
  IconHeart,
  IconSun,
  IconMoon,
  IconPause,
  IconPlay,
  IconReset,
  IconFullscreen,
  IconCamera,
  IconSave,
  IconClose,
  IconSettings,
} from '@/components/ui/Icons'

const HOME_SEARCH = { q: '', cat: 'all' as const, sort: 'title' as const, dir: 'asc' as const, fav: false, recent: false } as const

/* ============================================================
   顶部栏：返回 / 标题 / 收藏
   收藏按钮统一成 GlassButton，与全站控件风格一致。
   ============================================================ */
export const GameTopBar = memo(function GameTopBar({
  game,
  isFavorite,
  onToggleFavorite,
}: {
  game: Game
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  const { isDark, toggle } = useThemeToggle()
  return (
    <header className="flex items-center gap-2">
      <Link to="/" search={HOME_SEARCH} aria-label="返回游戏库" className="shrink-0">
        <GlassButton variant="glass" size="icon">
          <IconBack size={18} />
        </GlassButton>
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold leading-tight">{game.title}</h1>
      </div>
      <GlassButton
        variant="glass"
        size="icon"
        onClick={() => onToggleFavorite(game.id)}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
        aria-pressed={isFavorite}
        title={isFavorite ? '已收藏' : '收藏'}
        className={cx(
          'transition-[color,background-color,border-color] duration-300 [transition-timing-function:var(--ease-glass)]',
          isFavorite &&
            'border-[color-mix(in_srgb,var(--color-rose)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-rose)_12%,transparent)] text-[var(--color-rose)]',
        )}
      >
        {/* key 随选中态翻转 → 每次点击重播一次轻微心跳，克制不抢戏 */}
        <span key={isFavorite ? 'on' : 'off'} className={cx(isFavorite && 'heart-pop')}>
          <IconHeart size={18} filled={isFavorite} />
        </span>
      </GlassButton>
      <GlassButton
        variant="glass"
        size="icon"
        onClick={toggle}
        aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
        title={isDark ? '浅色主题' : '深色主题'}
      >
        {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </GlassButton>
    </header>
  )
})

/* ============================================================
   底部工具条：播放/暂停 / 重置 / 全屏 / 音量 / 截图封面 / 存档 / 移除
   原为 PlayPage 内联 JSX，抽出来让 PlayPage 只做编排。
   ============================================================ */
interface GameToolbarProps {
  api: EmulatorApi
  playing: boolean
  volume: number
  muted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  onCover: () => void
  panelOpen: boolean
  onTogglePanel: () => void
  keymapOpen: boolean
  onToggleKeymap: () => void
  onRemove?: () => void
}

export const GameToolbar = memo(function GameToolbar({
  api,
  playing,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  onCover,
  panelOpen,
  onTogglePanel,
  keymapOpen,
  onToggleKeymap,
  onRemove,
}: GameToolbarProps) {
  const disabled = api.status === 'loading' || api.status === 'error'
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <GlassButton
        variant={playing ? 'glass' : 'primary'}
        size="icon"
        onClick={api.togglePause}
        disabled={disabled}
        title={playing ? '暂停' : '继续'}
        aria-label={playing ? '暂停' : '继续'}
      >
        {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
      </GlassButton>
      <GlassButton variant="glass" size="icon" onClick={api.reset} title="重置游戏" aria-label="重置游戏">
        <IconReset size={18} />
      </GlassButton>
      <GlassButton
        variant="glass"
        size="icon"
        onClick={api.toggleFullscreen}
        title="全屏"
        aria-label="全屏"
      >
        <IconFullscreen size={18} />
      </GlassButton>

      <VolumeControl
        volume={volume}
        muted={muted}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
        collapsible
      />

      <GlassButton
        variant="glass"
        size="icon"
        onClick={onCover}
        title="截图当封面"
        aria-label="截图当封面"
      >
        <IconCamera size={18} />
      </GlassButton>
      <GlassButton
        variant={panelOpen ? 'primary' : 'glass'}
        size="icon"
        onClick={onTogglePanel}
        title="存档 / 读档"
        aria-label="存档 / 读档"
      >
        <IconSave size={18} />
      </GlassButton>
      <GlassButton
        variant={keymapOpen ? 'primary' : 'glass'}
        size="icon"
        onClick={onToggleKeymap}
        title="键位设置"
        aria-label="键位设置"
      >
        <IconSettings size={18} />
      </GlassButton>

      {onRemove && (
        <GlassButton
          variant="glass"
          size="icon"
          title="移除该上传 ROM"
          aria-label="移除该上传 ROM"
          onClick={onRemove}
        >
          <IconClose size={18} />
        </GlassButton>
      )}
    </div>
  )
})

/* ============================================================
   快捷键提示：提升可发现性（仅信息展示，真正的行为由 PlayPage 的快捷键 effect 实现）
   ============================================================ */
export const ShortcutHints = memo(function ShortcutHints() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--ink-4)]">
      <span className="flex items-center gap-1.5">
        <kbd className="kbd">空格</kbd> 暂停
      </span>
      <span className="flex items-center gap-1.5">
        <kbd className="kbd">F</kbd> 全屏
      </span>
      <span className="flex items-center gap-1.5">
        <kbd className="kbd">Esc</kbd> 关闭面板
      </span>
    </div>
  )
})
