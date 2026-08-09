import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { IconUpload, IconSettings, IconSun, IconMoon } from '@/components/ui/Icons'
import { useThemeToggle } from '@/lib/useThemeSync'
import { usePointerGlow } from '@/lib/pointer'
import { cx } from '@/lib/cx'

export function TopBar() {
  const barRef = useRef<HTMLElement>(null)
  usePointerGlow(barRef)

  const { isDark, toggle } = useThemeToggle()

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={barRef}
      className={cx(
        'sticky top-0 z-50 w-full',
        'transition-[padding] duration-500 [transition-timing-function:var(--ease-glass)]',
        scrolled
          ? 'pt-[calc(env(safe-area-inset-top)_+_12px)] pb-2'
          : 'pt-[calc(env(safe-area-inset-top)_+_20px)] pb-3',
      )}
    >
      <div className="stack-page">
        <div
          className={cx(
            'glass-frame glass-refract glass-sheen',
            'flex items-center gap-2 sm:gap-3',
            'rounded-[var(--radius-glass-lg)] px-3 sm:px-4',
            'transition-[height] duration-500 [transition-timing-function:var(--ease-glass)]',
            scrolled ? 'h-14' : 'h-16',
          )}
        >
          <Link
            to="/"
            search={{ q: '', cat: 'all', sort: 'title', fav: false }}
            className="group flex shrink-0 items-center gap-2.5 rounded-[var(--radius-glass-sm)] px-1.5 py-1"
            aria-label="返回游戏库首页"
          >
            <span
              aria-hidden="true"
              className={cx(
                'grid size-9 place-items-center rounded-[13px]',
                'bg-[linear-gradient(140deg,var(--color-brand),color-mix(in_srgb,var(--color-rose)_70%,var(--color-brand)))]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_6px_18px_-8px_color-mix(in_srgb,var(--color-brand)_80%,transparent)]',
                'transition-transform duration-500 group-hover:scale-105 group-hover:rotate-[-4deg]',
                '[transition-timing-function:var(--ease-spring)]',
              )}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
                <path d="M6.5 10.5v3M5 12h3" />
                <circle cx="16" cy="11" r="1.3" fill="#fff" stroke="none" />
                <circle cx="18.2" cy="13.4" r="1.3" fill="#fff" stroke="none" />
                <path d="M7.4 6.5h9.2a4.6 4.6 0 0 1 4.5 3.7l.6 3.7a2.7 2.7 0 0 1-5 1.8l-.7-1.2H8l-.7 1.2a2.7 2.7 0 0 1-5-1.8l.6-3.7a4.6 4.6 0 0 1 4.5-3.7Z" strokeWidth="1.7" />
              </svg>
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight sm:block">
              NES <span className="text-[var(--ink-3)]">Arcade</span>
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
              title={isDark ? '浅色主题' : '深色主题'}
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </GlassButton>
            <Link to="/upload" aria-label="上传 ROM" title="上传 ROM">
              <GlassButton variant="ghost" size="icon" aria-label="上传 ROM">
                <IconUpload size={18} />
              </GlassButton>
            </Link>
            <Link to="/settings" aria-label="设置" title="设置">
              <GlassButton variant="ghost" size="icon" aria-label="设置">
                <IconSettings size={18} />
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
