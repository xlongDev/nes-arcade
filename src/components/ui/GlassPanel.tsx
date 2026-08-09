import { useCallback, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '@/lib/cx'
import { usePointerGlow } from '@/lib/pointer'

type Tone = 'frame' | 'panel' | 'faux'
type Radius = 'sm' | 'md' | 'lg' | 'xl'

const TONE: Record<Tone, string> = {
  frame: 'glass-frame',
  panel: 'glass',
  faux: 'glass-faux',
}

const RADIUS: Record<Radius, string> = {
  sm: 'rounded-[var(--radius-glass-sm)]',
  md: 'rounded-[var(--radius-glass-md)]',
  lg: 'rounded-[var(--radius-glass-lg)]',
  xl: 'rounded-[var(--radius-glass-xl)]',
}

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * frame / panel 带 backdrop-filter，是真玻璃 —— 全站同时可见的数量要控制在 6 层以内。
   * 列表里的重复元素一律用 faux。
   */
  tone?: Tone
  radius?: Radius
  /** 指针跟随高光。列表项请用网格级委托，不要逐个开。 */
  sheen?: boolean
  refract?: boolean
  /**
   * 外部 ref。内部本来就要拿 DOM 给指针高光用，所以这里做一次合并，
   * 不能直接透传 —— 否则 spread 会把内部 ref 覆盖掉，高光就失灵了。
   */
  ref?: Ref<HTMLDivElement>
  children?: ReactNode
}

export function GlassPanel({
  tone = 'panel',
  radius = 'md',
  sheen = false,
  refract = true,
  className,
  children,
  ref: forwardedRef,
  ...rest
}: GlassPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  usePointerGlow(sheen ? ref : { current: null })

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef],
  )

  return (
    <div
      ref={setRef}
      className={cx(
        TONE[tone],
        RADIUS[radius],
        sheen && 'glass-sheen',
        refract && 'glass-refract',
        'isolate',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
