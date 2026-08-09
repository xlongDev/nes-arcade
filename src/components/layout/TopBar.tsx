import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { IconSearch, IconClose, IconSun, IconMoon } from '@/components/ui/Icons'
import { useThemeToggle } from '@/lib/useThemeSync'
import { usePointerGlow } from '@/lib/pointer'
import { cx } from '@/lib/cx'
import type { LibrarySearch } from '@/router'

/* 主导航 Tab：Logo 右侧，当前页用滑动玻璃指示器高亮 */
function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const tabs = useMemo(
    () => [
      { to: '/', label: '游戏库', match: (p: string) => p === '/' },
      { to: '/upload', label: '上传', match: (p: string) => p.startsWith('/upload') },
      { to: '/settings', label: '设置', match: (p: string) => p.startsWith('/settings') },
    ],
    [],
  )
  const activeIdx = Math.max(0, tabs.findIndex((t) => t.match(pathname)))
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const el = spanRefs.current[activeIdx]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIdx, pathname])

  return (
    <nav aria-label="主导航" className="relative flex items-center rounded-full p-1">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_42%,transparent)] transition-[transform,width] duration-300 [transition-timing-function:var(--ease-spring)]"
        style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
      />
      {tabs.map((t, i) => (
        <span key={t.to} ref={(el) => { spanRefs.current[i] = el }} className="relative z-10">
          <Link
            to={t.to}
            className={cx(
              'block rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
              t.match(pathname)
                ? 'text-[var(--color-brand)]'
                : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]',
            )}
          >
            {t.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}

export function TopBar() {
  const navigate = useNavigate()
  const barRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  usePointerGlow(barRef)

  const { isDark, toggle } = useThemeToggle()

  const urlQuery = useRouterState({
    select: (s) => (s.location.pathname === '/' ? ((s.location.search as { q?: string }).q ?? '') : ''),
  })
  const currentSearch = useRouterState({
    select: (s) => s.location.search as LibrarySearch,
  })
  const [draft, setDraft] = useState(urlQuery)
  const [scrolled, setScrolled] = useState(false)

  // URL 变化（后退、点分类）时把输入框拉回同步
  useEffect(() => setDraft(urlQuery), [urlQuery])

  // 输入防抖 160ms 再写 URL，且用 replace —— 否则打 5 个字会塞 5 条历史记录
  useEffect(() => {
    if (draft === urlQuery) return
    const t = setTimeout(() => {
      void navigate({
        to: '/',
        search: () => ({ ...currentSearch, q: draft }),
        replace: true,
      })
    }, 160)
    return () => clearTimeout(t)
  }, [draft, urlQuery, navigate, currentSearch])

  // 滚动后顶栏收紧一点，让内容区更宽敞
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ⌘K / Ctrl+K / 斜杠 聚焦搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setDraft('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleTheme = toggle

  return (
    <header
      ref={barRef}
      className={cx(
        'sticky top-0 z-50 w-full',
        'transition-[padding] duration-500 [transition-timing-function:var(--ease-glass)]',
        // 静止时留 20px 呼吸感，滚动后收紧到 12px。
        scrolled
          ? 'pt-[calc(env(safe-area-inset-top)_+_12px)] pb-2'
          : 'pt-[calc(env(safe-area-inset-top)_+_20px)] pb-3',
      )}
    >
      <div className="stack-page">
        <div
          className={cx(
            // 常态：伪玻璃 + 轻模糊，降低重量；滚动吸顶后升级为真玻璃（更强模糊 + 折射 + 高光）
            scrolled
              ? 'glass-frame glass-refract glass-sheen'
              : 'glass-faux backdrop-blur-md',
            'flex items-center gap-2 sm:gap-3',
            'rounded-[var(--radius-glass-lg)] border-b border-[var(--line-1)] px-3 sm:px-4',
            'transition-[height] duration-500 [transition-timing-function:var(--ease-glass)]',
            scrolled ? 'h-14' : 'h-16',
          )}
        >
          {/* 左侧：Logo + 页面 Tab */}
          <div className="flex min-w-0 items-center gap-2">
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

            <TopNav />
          </div>

          {/* 中间：居中的玻璃搜索胶囊 */}
          <div className="flex min-w-0 flex-1 justify-center px-1">
            <div className="w-full max-w-md">
              <label htmlFor="global-search" className="sr-only">
                搜索游戏（支持中文、拼音、英文名）
              </label>
              <div
                className={cx(
                  'glass-faux group flex h-10 w-full items-center gap-2 rounded-full pl-3 pr-1.5',
                  'transition-[box-shadow,border-color] duration-300 [transition-timing-function:var(--ease-glass)]',
                  'focus-within:border-[color-mix(in_srgb,var(--color-brand)_55%,transparent)]',
                  'focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-brand)_30%,transparent)]',
                )}
              >
                <IconSearch
                  size={17}
                  className="shrink-0 text-[var(--ink-4)] transition-colors duration-300 group-focus-within:text-[var(--color-brand)]"
                />
                <input
                  id="global-search"
                  ref={inputRef}
                  type="search"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="搜索游戏 · 中文 / 拼音 / 英文"
                  autoComplete="off"
                  spellCheck={false}
                  className={cx(
                    'min-w-0 flex-1 bg-transparent text-[14px] text-[var(--ink-1)]',
                    'placeholder:text-[var(--ink-4)] focus:outline-none',
                    '[&::-webkit-search-cancel-button]:hidden',
                  )}
                />
                {draft ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft('')
                      inputRef.current?.focus()
                    }}
                    aria-label="清空搜索"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] hover:text-[var(--ink-1)]"
                  >
                    <IconClose size={15} />
                  </button>
                ) : (
                  <kbd
                    aria-hidden="true"
                    className="hidden shrink-0 rounded-md border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--ink-4)] sm:block"
                  >
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：主题切换（统一玻璃风） */}
          <div className="flex shrink-0 items-center gap-1.5">
            <GlassButton
              variant="glass"
              size="icon"
              onClick={toggleTheme}
              aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
              title={isDark ? '浅色主题' : '深色主题'}
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </GlassButton>
          </div>
        </div>
      </div>
    </header>
  )
}
