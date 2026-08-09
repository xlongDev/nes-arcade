import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '@/lib/cx'

type Variant = 'primary' | 'glass' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANT: Record<Variant, string> = {
  primary:
    'text-white shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--color-brand)_70%,transparent)] ' +
    'bg-[linear-gradient(140deg,color-mix(in_srgb,var(--color-brand)_92%,white_18%),color-mix(in_srgb,var(--color-brand)_78%,black_14%))] ' +
    'border border-[color-mix(in_srgb,white_28%,transparent)] hover:brightness-110',
  glass: 'glass-faux glass-faux-hoverable text-[var(--ink-1)] hover:border-[var(--line-2)]',
  ghost:
    'bg-transparent border border-transparent text-[var(--ink-2)] ' +
    'hover:bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)] hover:text-[var(--ink-1)]',
  danger:
    'text-white border border-[color-mix(in_srgb,white_24%,transparent)] ' +
    'bg-[linear-gradient(140deg,#ff7a8f,#e0455f)] hover:brightness-110',
}

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-[var(--radius-glass-xs)] gap-1.5',
  md: 'h-11 px-5 text-[14px] rounded-[var(--radius-glass-sm)] gap-2',
  lg: 'h-14 px-7 text-[15px] rounded-[var(--radius-glass-md)] gap-2.5',
  icon: 'h-11 w-11 rounded-[var(--radius-glass-sm)]',
}

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  active?: boolean
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function GlassButton({
  variant = 'glass',
  size = 'md',
  loading = false,
  active = false,
  className,
  children,
  disabled,
  ...rest
}: GlassButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={active || undefined}
      className={cx(
        'relative inline-flex select-none items-center justify-center overflow-hidden',
        'font-medium tracking-tight whitespace-nowrap',
        'transition-[transform,filter,background,border-color,box-shadow] duration-300',
        '[transition-timing-function:var(--ease-glass)]',
        'active:scale-[0.965] disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        active && 'border-[var(--line-3)] brightness-110',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-inherit backdrop-blur-sm"
        >
          <span className="size-4 animate-[spin-slow_0.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent opacity-80" />
        </span>
      )}
      <span className={cx('inline-flex items-center gap-[inherit]', loading && 'opacity-0')}>
        {children}
      </span>
    </button>
  )
}
