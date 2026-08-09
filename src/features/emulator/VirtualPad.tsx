import { useCallback, useRef } from 'react'
import type { NesButton } from '@/types/game'
import { cx } from '@/lib/cx'

interface VirtualPadProps {
  pressDown: (b: NesButton) => void
  pressUp: (b: NesButton) => void
  haptics: boolean
}

/**
 * 移动端虚拟手柄。
 *
 * 用 pointer 事件而非 touch，能同时覆盖触摸与触控笔；
 * 每个键按下时记录 button，松开 / 移出 / 取消时补一次 up，永不卡键。
 * 长按方向也不重复触发（pressDown 是边沿事件）。
 */
export function VirtualPad({ pressDown, pressUp, haptics }: VirtualPadProps) {
  const active = useRef<NesButton | null>(null)

  const bind = useCallback(
    (btn: NesButton) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        active.current = btn
        pressDown(btn)
        if (haptics && navigator.vibrate) navigator.vibrate(8)
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault()
        if (active.current === btn) {
          pressUp(btn)
          active.current = null
        }
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (active.current === btn) {
          pressUp(btn)
          active.current = null
        }
        e.preventDefault()
      },
      onPointerCancel: () => {
        if (active.current === btn) {
          pressUp(btn)
          active.current = null
        }
      },
    }),
    [pressDown, pressUp, haptics],
  )

  const keyClass = cx(
    'grid place-items-center select-none rounded-[22px]',
    'bg-[color-mix(in_srgb,var(--ink-1)_12%,transparent)]',
    'border border-[var(--line-2)] text-[var(--ink-1)]',
    'shadow-[var(--bevel-soft)] backdrop-blur-xl',
    'active:scale-95 transition-transform duration-150 touch-none',
  )

  return (
    <div
      className="pointer-events-auto grid grid-cols-[1fr_auto] items-center gap-5 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3"
      aria-label="虚拟手柄"
    >
      {/* 方向键：十字布局 */}
      <div className="grid grid-cols-3 grid-rows-3 gap-2 w-[168px] h-[168px]">
        <span className="col-start-2 row-start-1">
          <button type="button" aria-label="上" {...bind('up')} className={cx(keyClass, 'h-14')}>
            ▲
          </button>
        </span>
        <span className="col-start-1 row-start-2">
          <button type="button" aria-label="左" {...bind('left')} className={cx(keyClass, 'h-14')}>
            ◀
          </button>
        </span>
        <span className="col-start-2 row-start-2">
          <span className="block h-14 rounded-[22px] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] border border-[var(--line-1)]" />
        </span>
        <span className="col-start-3 row-start-2">
          <button type="button" aria-label="右" {...bind('right')} className={cx(keyClass, 'h-14')}>
            ▶
          </button>
        </span>
        <span className="col-start-2 row-start-3">
          <button type="button" aria-label="下" {...bind('down')} className={cx(keyClass, 'h-14')}>
            ▼
          </button>
        </span>
      </div>

      {/* A / B + Start / Select */}
      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="B 键"
            {...bind('b')}
            className={cx(keyClass, 'size-16 rounded-full text-[15px] font-bold')}
          >
            B
          </button>
          <button
            type="button"
            aria-label="A 键"
            {...bind('a')}
            className={cx(keyClass, 'size-16 rounded-full text-[15px] font-bold')}
          >
            A
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--ink-3)]">
          <button type="button" aria-label="Select" {...bind('select')} className={cx(keyClass, 'h-9 px-4 rounded-full')}>
            SEL
          </button>
          <button type="button" aria-label="Start" {...bind('start')} className={cx(keyClass, 'h-9 px-4 rounded-full')}>
            STA
          </button>
        </div>
      </div>
    </div>
  )
}
