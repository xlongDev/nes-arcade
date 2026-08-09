import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  /** 右上角计数角标 */
  count?: number
  title?: string
}

interface SegmentedProps<T extends string> {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * 分段控制器。选中态是一块会滑动的液态玻璃 —— 用绝对定位的指示器做位移，
 * 而不是给每个按钮加背景，这样切换时才有"一整块玻璃流过去"的感觉。
 *
 * 无障碍：role=tablist + 方向键导航（WAI-ARIA Tabs 模式）。
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null)

  const sync = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return setIndicator(null)
    setIndicator({ x: active.offsetLeft, w: active.offsetWidth })
  }, [])

  useEffect(() => {
    sync()
    const list = listRef.current
    if (!list) return
    // 容器宽度变化（换行、字体加载完成）后指示器要跟着重算
    const ro = new ResizeObserver(sync)
    ro.observe(list)
    return () => ro.disconnect()
  }, [sync, value, options])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = options.findIndex((o) => o.value === value)
    if (idx < 0) return
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (idx - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    const target = options[next]
    if (target) onChange(target.value)
  }

  const pad = size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-[14px]'

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        'glass-faux glass-refract relative inline-flex items-center gap-1 p-1',
        'rounded-[var(--radius-glass-md)]',
        className,
      )}
    >
      {indicator && (
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute top-1 bottom-1 z-0',
            'rounded-[calc(var(--radius-glass-md)-4px)]',
            'bg-[var(--glass-frame)] border border-[var(--line-2)]',
            'shadow-[var(--bevel)] backdrop-blur-xl',
            'transition-[transform,width] duration-[420ms] [transition-timing-function:var(--ease-spring)]',
          )}
          style={{ transform: `translateX(${indicator.x - 4}px)`, width: indicator.w }}
        />
      )}

      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-active={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-glass-sm)]',
              'font-medium whitespace-nowrap transition-colors duration-300',
              pad,
              active ? 'text-[var(--ink-1)]' : 'text-[var(--ink-3)] hover:text-[var(--ink-2)]',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cx(
                  'tnum rounded-full px-1.5 py-px text-[10px] leading-[1.5] transition-colors',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--color-brand)_36%,transparent)] text-[var(--ink-1)]'
                    : 'bg-[color-mix(in_srgb,var(--ink-1)_9%,transparent)] text-[var(--ink-4)]',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
