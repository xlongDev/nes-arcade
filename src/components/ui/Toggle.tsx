import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

/**
 * 开关。role=switch + aria-checked，键盘可聚焦可操作（Space / Enter 切换），
 * 拖柄用 transform 平移，过渡走弹簧曲线。
 */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={typeof label === 'string' ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'group flex w-full items-center justify-between gap-4 rounded-[var(--radius-glass-md)]',
        'px-4 py-3 text-left transition-opacity',
        disabled && 'opacity-45',
      )}
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-[var(--ink-1)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-snug text-[var(--ink-3)]">{description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300',
          checked
            ? 'border-[color-mix(in_srgb,var(--color-brand)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_55%,transparent)]'
            : 'border-[var(--line-2)] bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)]',
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 size-5 rounded-full bg-white shadow-md',
            'transition-transform duration-300 [transition-timing-function:var(--ease-spring)]',
            checked ? 'translate-x-[26px]' : 'translate-x-[3px]',
            '-translate-y-1/2',
          )}
        />
      </span>
    </button>
  )
}
