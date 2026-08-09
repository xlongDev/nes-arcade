import { Link } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { IconGrid } from '@/components/ui/Icons'

export function NotFound() {
  return (
    <div className="stack-page grid min-h-[80vh] place-items-center pt-10">
      <div className="glass-faux flex max-w-md flex-col items-center gap-5 rounded-[var(--radius-glass-xl)] px-8 py-16 text-center">
        <span className="text-6xl font-bold tracking-tight text-[var(--ink-2)]">404</span>
        <div>
          <p className="text-[16px] font-semibold">这一页好像卡带了</p>
          <p className="mt-1 text-[13px] text-[var(--ink-3)]">你要找的页面不存在，或者已经下架。</p>
        </div>
        <Link to="/" search={{ q: '', cat: 'all', sort: 'title', fav: false }}>
          <GlassButton variant="primary">
            <IconGrid size={16} /> 回到游戏库
          </GlassButton>
        </Link>
      </div>
    </div>
  )
}
