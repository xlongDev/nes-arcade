import { memo } from 'react'
import type { EmuStatus } from '@/features/emulator/useEmulator'
import { cx } from '@/lib/cx'

interface StatusMeta {
  label: string
  dot: string
  pulse?: boolean
}

const STATUS_META: Record<EmuStatus, StatusMeta> = {
  idle: { label: '待机', dot: 'bg-[var(--ink-3)]' },
  loading: { label: '载入中', dot: 'bg-[var(--color-amber)]', pulse: true },
  running: { label: '运行中', dot: 'bg-[color-mix(in_srgb,var(--color-mint)_72%,white)]' },
  paused: { label: '已暂停', dot: 'bg-[var(--color-brand)]' },
  error: { label: '出错', dot: 'bg-[var(--color-rose)]' },
}

interface StatusBadgeProps {
  status: EmuStatus
  /** 内核名，默认 fceumm */
  core?: string
  /** 是否展示"离线可用"徽标（本地内核、无运行时 CDN 依赖） */
  offline?: boolean
  /** 已玩时长（秒），仅 running/paused 态展示 */
  elapsed?: number
  className?: string
}

/**
 * 常驻状态条：把模拟器的 5 种状态（idle/loading/running/paused/error）收拢成
 * 一个始终可见的玻璃胶囊。配合 PlayPage 里全屏的 loading/error 遮罩使用——
 * 遮罩给"重反馈"，状态条给"常驻摘要"，二者驱动同一份 status，不会各说各话。
 *
 * - role=status + aria-live=polite：状态切换时屏幕阅读器会播报
 * - 加载态用 ping 脉冲点，而非整段文字闪烁，更克制
 */
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const StatusBadge = memo(function StatusBadge({
  status,
  core = 'fceumm',
  offline = true,
  elapsed = 0,
  className,
}: StatusBadgeProps) {
  const meta = STATUS_META[status]
  const showElapsed = elapsed > 0 && (status === 'running' || status === 'paused')
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'glass-faux inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px]',
        'border border-[var(--line-1)] text-[var(--ink-2)]',
        className,
      )}
    >
      <span className="relative grid size-2.5 place-items-center">
        {meta.pulse && (
          <span className={cx('absolute size-2 rounded-full', meta.dot, 'animate-ping opacity-60')} />
        )}
        <span className={cx('size-2 rounded-full', meta.dot)} />
      </span>
      <span className="font-medium text-[var(--ink-1)]">{meta.label}</span>
      {showElapsed && (
        <>
          <span aria-hidden className="text-[var(--ink-4)]">·</span>
          <span aria-hidden className="tnum font-mono text-[11px] text-[var(--ink-2)]">
            {formatClock(elapsed)}
          </span>
        </>
      )}
      <span className="text-[var(--ink-4)]">·</span>
      <span className="font-mono text-[11px] text-[var(--ink-3)]">{core}</span>
      {offline && (
        <span className="ml-0.5 inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-mint)_16%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--color-mint)_78%,white)]">
          <span className="size-1.5 rounded-full bg-[var(--color-mint)]" />
          离线可用
        </span>
      )}
    </div>
  )
})
