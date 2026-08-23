import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { IconUpload, IconSettings, IconSun, IconMoon, IconGithub } from '@/components/ui/Icons'
import { useThemeToggle } from '@/lib/useThemeSync'
import { usePointerGlow } from '@/lib/pointer'
import { cx } from '@/lib/cx'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

/**
 * 玻璃图标链接：与 GlassButton variant="ghost" size="icon" 视觉上完全一致，
 * 但渲染为 <a>，避免交互元素嵌套（Link > button 不合法），也适合外链。
 */
function GlassIconLink({
  href,
  to,
  children,
  className,
  external,
  ...rest
}: {
  href?: string
  to?: string
  children: ReactNode
  className?: string
  external?: boolean
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = cx(
    'inline-flex size-11 select-none items-center justify-center rounded-[var(--radius-glass-sm)]',
    'border border-transparent bg-transparent text-[var(--ink-2)]',
    'transition-[transform,background,color] duration-300',
    '[transition-timing-function:var(--ease-glass)]',
    'hover:bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)] hover:text-[var(--ink-1)]',
    'active:scale-[0.965]',
    className,
  )
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a
      href={href}
      className={classes}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...rest}
    >
      {children}
    </a>
  )
}

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

  // 把 TopBar 当前占位高度写到 :root 上,让下方吸顶工具栏跟着收缩,
  // 避免硬编码 92px 与收缩后的实际高度不同步
  // (静态 20+64+12=96,收缩 12+56+8=76,包含 safe-area 由 TopBar 自己撑开)
  useEffect(() => {
    const value = scrolled ? '76px' : '96px'
    document.documentElement.style.setProperty('--topbar-h', value)
    return () => {
      document.documentElement.style.removeProperty('--topbar-h')
    }
  }, [scrolled])

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
            'border-b-0 shadow-[var(--drop-lg)] [transform:translateZ(0)]',
            scrolled ? 'h-14' : 'h-16',
          )}
        >
          <Link
            to="/"
            search={{ q: '', cat: 'all', sort: 'title', dir: 'asc', fav: false, recent: false }}
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
            <GlassIconLink to="/upload" aria-label="上传 ROM" title="上传 ROM">
              <IconUpload size={18} />
            </GlassIconLink>
            <GlassIconLink to="/settings" aria-label="设置" title="设置">
              <IconSettings size={18} />
            </GlassIconLink>
            <GlassIconLink
              href="https://github.com/xlongDev/nes-arcade"
              external
              aria-label="在 GitHub 查看项目"
              title="GitHub"
            >
              <IconGithub size={18} />
            </GlassIconLink>
          </div>
        </div>
      </div>
    </header>
  )
}
