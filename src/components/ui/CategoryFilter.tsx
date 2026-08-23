import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface CategoryFilterOption {
  value: string
  label: ReactNode
  /** 左侧分类图标 */
  icon?: ReactNode
  /** 右上角计数角标 */
  count?: number
  title?: string
}

interface CategoryFilterProps {
  value: string
  options: readonly CategoryFilterOption[]
  onChange: (value: string) => void
  label: string
  /**
   * 关联的网格 panel id,挂到 role=tablist 的 aria-controls 上,
   * 让屏幕阅读器知道 tab 切换影响哪块内容。
   */
  ariaControls?: string
  className?: string
}

/**
 * 分类筛选：与 Segmented 一致的液态玻璃胶囊。
 * 外层是整块 glass-faux 容器，选中态由一块会滑动的玻璃指示器承载，
 * 切换时产生"一整块玻璃流过去"的连续感；按压带弹性回弹。
 * 无障碍：role=tablist + 方向键导航（WAI-ARIA Tabs 模式）。
 */
export function CategoryFilter({
  value,
  options,
  onChange,
  label,
  ariaControls,
  className,
}: CategoryFilterProps) {
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

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-controls={ariaControls}
      onKeyDown={onKeyDown}
      className={cx(
        'glass-faux glass-refract relative inline-flex items-center gap-1 overflow-x-auto p-1',
        'rounded-[var(--radius-glass-md)]',
        'scrollbar-hidden',
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
              'h-9 px-3 text-[13px] font-medium whitespace-nowrap',
              'transition-[color,transform] duration-300 [transition-timing-function:var(--ease-glass)]',
              'active:scale-[0.96] active:[transition-timing-function:var(--ease-spring)]',
              active ? 'text-[var(--ink-1)]' : 'text-[var(--ink-2)] hover:text-[var(--ink-1)]',
            )}
          >
            {o.icon && (
              <span
                aria-hidden
                className={cx('text-[13px] leading-none', active ? 'text-[var(--color-brand)]' : 'text-[var(--ink-4)]')}
              >
                {o.icon}
              </span>
            )}
            {o.label}
            {o.count !== undefined && (
              <span
                className={cx(
                  'tnum rounded-full px-1.5 py-px text-[10px] leading-[1.5] transition-colors',
                  active ? 'font-semibold' : 'font-medium',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--color-brand)_34%,transparent)] text-[var(--ink-1)]'
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
