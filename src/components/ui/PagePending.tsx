import { IconGamepad } from '@/components/ui/Icons'

/**
 * 懒加载页面就绪前的占位。
 * 避免切到 /upload /settings 时因 chunk 未加载完成而出现白屏一闪。
 */
export function PagePending() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glass-faux glass-refract flex items-center gap-3 rounded-[var(--radius-glass-md)] border border-[var(--line-1)] px-5 py-3">
        <IconGamepad size={18} className="animate-bounce text-[var(--color-brand)]" />
        <span className="text-[14px] text-[var(--ink-2)]">正在加载页面…</span>
      </div>
    </div>
  )
}
