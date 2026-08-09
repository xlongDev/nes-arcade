import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { IconGrid, IconSparkle } from '@/components/ui/Icons'

/**
 * 404。
 *
 * 用了 FC 玩家都懂的梗：卡带接触不良 → 拔出来吹一吹再插回去。
 * "吹一吹"按钮触发一次 RGB 色偏抖动，纯粹是个彩蛋，
 * 但比一句干巴巴的"页面不存在"讨喜得多。
 *
 * 动效走 CSS，reduced-motion 由 glass.css 的全局降级兜底（会静止）。
 */
export function NotFound() {
  const [burst, setBurst] = useState(0)

  return (
    <div className="stack-page grid min-h-[80vh] place-items-center pt-10">
      <div className="glass-faux flex max-w-md flex-col items-center gap-5 rounded-[var(--radius-glass-xl)] px-8 py-16 text-center">
        <span
          // key 变化才能重播一次性动画
          key={burst}
          aria-hidden="true"
          className={burst ? 'glitch-burst' : 'glitch'}
          style={{
            fontSize: 'clamp(64px, 14vw, 96px)',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-2)',
          }}
        >
          404
        </span>

        <div>
          <p className="text-[16px] font-semibold">这一页接触不良</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-3)]">
            你要找的页面不存在，或者已经拔卡了。
            <br className="hidden sm:block" />
            要不…先吹一吹？
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <GlassButton variant="glass" onClick={() => setBurst((n) => n + 1)}>
            <IconSparkle size={16} /> 吹一吹
          </GlassButton>
          <Link to="/" search={{ q: '', cat: 'all', sort: 'title', fav: false }}>
            <GlassButton variant="primary">
              <IconGrid size={16} /> 回到游戏库
            </GlassButton>
          </Link>
        </div>
      </div>
    </div>
  )
}
