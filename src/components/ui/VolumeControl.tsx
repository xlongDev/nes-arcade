import { memo, useRef, useState } from 'react'
import { IconVolume } from '@/components/ui/Icons'
import { GlassButton } from '@/components/ui/GlassButton'
import { cx } from '@/lib/cx'

interface VolumeControlProps {
  volume: number
  muted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  /**
   * 收合模式：默认只显示玻璃图标按钮（音量图标必现），hover / 键盘聚焦时右侧
   * 弹性滑出滑块。播放页工具条按钮多、空间紧，用这个；设置页空间宽裕，传 false 常驻。
   */
  collapsible?: boolean
  className?: string
}

interface VolumeSliderProps {
  volume: number
  onVolumeChange: (v: number) => void
  disabled?: boolean
  tabIndex?: number
  ariaHidden?: boolean
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/**
 * 完全自定义的音量滑块：用 div 画轨道/填充/白色 thumb，再在上面覆盖一层
 * 透明原生 input[type=range] 负责拖拽、点击、键盘。这样可以 100% 控制视觉，
 * 避开浏览器原生 range "两端白、中间 accent 色" 的渲染坑，同时保留无障碍。
 */
const VolumeSlider = memo(function VolumeSlider({
  volume,
  onVolumeChange,
  disabled,
  tabIndex,
  ariaHidden,
}: VolumeSliderProps) {
  const progress = Math.round(volume * 100)
  return (
    <div
      className="group/slider relative h-4 w-full cursor-pointer"
      style={{ '--progress': `${progress}%` } as React.CSSProperties}
      aria-hidden={ariaHidden}
    >
      {/* 视觉轨道 */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--ink-4)]" />
      {/* 视觉填充（品牌色） */}
      <div
        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-l-full bg-[var(--color-brand)]"
        style={{ width: `${progress}%` }}
      />
      {/* 视觉 thumb：液态玻璃质感的小珠子 */}
      <div
        className={cx(
          'absolute top-1/2 size-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full',
          'bg-gradient-to-b from-white/95 to-white/55',
          'ring-1 ring-white/50',
          'shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_6px_-2px_rgba(0,0,0,0.45)]',
          'backdrop-blur-[2px]',
          'transition-transform duration-200 [transition-timing-function:var(--ease-spring)]',
          'group-hover/slider:scale-[1.18] group-active/slider:scale-90',
        )}
        style={{ left: `${progress}%` }}
      />
      {/* 透明原生 input：负责拖拽、点击、键盘 */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        disabled={disabled}
        onChange={(e) => onVolumeChange(clamp(Number(e.target.value), 0, 1))}
        aria-label="音量"
        tabIndex={tabIndex}
        className="absolute inset-0 z-10 m-0 w-full cursor-pointer opacity-0 [appearance:none]"
      />
    </div>
  )
})

/**
 * 统一的音量控件：播放页（PlayPage）与设置页（SettingsPage）原本各写了一遍
 * mute 按钮 + range，现在抽到这里，保证两处样式、可访问性标签完全一致。
 */
export const VolumeControl = memo(function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  collapsible = false,
  className,
}: VolumeControlProps) {
  const level = muted ? 0 : volume > 0.5 ? 2 : 1
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = collapsible ? hovered || focused : true

  // 常驻展开（设置页等空间宽裕处）
  if (!collapsible) {
    return (
      <div
        className={cx(
          'glass-faux flex items-center gap-2 rounded-[var(--radius-glass-sm)] px-3 py-2',
          className,
        )}
      >
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? '取消静音' : '静音'}
          className="text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
        >
          <IconVolume size={18} level={level} />
        </button>
        {/* 设置页滑块需要固定宽度：外层 flex 容器无固定宽，滑块 w-full 会被压到 0 */}
        <div className="w-[140px]">
          <VolumeSlider volume={volume} onVolumeChange={onVolumeChange} />
        </div>
      </div>
    )
  }

  // 收合模式：hover / 聚焦时右侧弹性滑出滑块，触发按钮始终显示音量图标
  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      className={cx('relative inline-flex items-center', className)}
    >
      <GlassButton
        variant="glass"
        size="icon"
        onClick={onToggleMute}
        aria-label={muted ? '取消静音' : '静音'}
        aria-expanded={open}
        className="shrink-0"
      >
        <IconVolume size={18} level={level} />
      </GlassButton>

      <div
        className={cx(
          'glass-faux flex items-center overflow-visible rounded-[var(--radius-glass-sm)]',
          'transition-[width,margin,opacity] duration-300 [transition-timing-function:var(--ease-spring)]',
          open ? 'ml-2 w-[112px] px-3 opacity-100' : 'ml-0 w-0 px-0 opacity-0 pointer-events-none',
        )}
      >
        <VolumeSlider
          volume={volume}
          onVolumeChange={onVolumeChange}
          tabIndex={open ? 0 : -1}
          ariaHidden={!open}
        />
      </div>
    </div>
  )
})
