import { memo } from 'react'
import { IconVolume } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

interface VolumeControlProps {
  volume: number
  muted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  className?: string
}

/**
 * 统一的音量控件：播放页（PlayPage）与设置页（SettingsPage）原本各写了一遍
 * mute 按钮 + range，现在抽到这里，保证两处样式、可访问性标签完全一致。
 */
export const VolumeControl = memo(function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  className,
}: VolumeControlProps) {
  const level = muted ? 0 : volume > 0.5 ? 2 : 1
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
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        aria-label="音量"
        className="h-1.5 w-24 cursor-pointer accent-[var(--color-brand)] sm:w-32"
      />
    </div>
  )
})
