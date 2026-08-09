import { useRef, type ReactNode } from 'react'
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
  className?: string
}

/**
 * 分类筛选：换行式玻璃胶囊（chip）。
 * 相比单行 Segmented，所有分类在任何宽度下都一眼可见、无需横向滚动。
 * 选中态用品牌色填充胶囊 + 描边替代滑动玻璃指示器。
 * 无障碍：role=tablist + 方向键导航（与 Segmented 行为一致）。
 */
export function CategoryFilter({
  value,
  options,
  onChange,
  label,
  className,
}: CategoryFilterProps) {
  const listRef = useRef<HTMLDivElement>(null)

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
      onKeyDown={onKeyDown}
      className={cx('flex flex-wrap items-center gap-2', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5',
              'whitespace-nowrap font-medium leading-none',
              'transition-[color,background,box-shadow,transform] duration-300',
              '[transition-timing-function:var(--ease-glass)] active:scale-[0.96]',
              active
                ? 'border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--color-brand)_26%,transparent)] text-[var(--ink-1)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]'
                : 'border border-[var(--line-1)] bg-[var(--chip-bg)] text-[var(--ink-3)] hover:bg-[var(--chip-bg-hover)] hover:text-[var(--ink-2)]',
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
                  'tnum rounded-full px-1.5 py-px text-[10px] leading-[1.5]',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--color-brand)_34%,transparent)] text-[var(--ink-1)]'
                    : 'bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] text-[var(--ink-4)]',
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
