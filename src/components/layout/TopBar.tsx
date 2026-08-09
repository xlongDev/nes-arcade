import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { IconSearch, IconClose, IconUpload, IconSettings, IconSun, IconMoon } from '@/components/ui/Icons'
import { usePrefs, resolveTheme } from '@/stores/prefs'
import { switchThemeWithTransition } from '@/lib/useThemeSync'
import { usePointerGlow } from '@/lib/pointer'
import { cx } from '@/lib/cx'
import type { LibrarySearch } from '@/router'

export function TopBar() {
  const navigate = useNavigate()
  const barRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  usePointerGlow(barRef)

  const themeMode = usePrefs((s) => s.themeMode)
  const setThemeMode = usePrefs((s) => s.setThemeMode)
  const isDark = resolveTheme(themeMode) === 'dark'

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

  const toggleTheme = () => {
    switchThemeWithTransition(() => setThemeMode(isDark ? 'light' : 'dark'))
  }

  return (
    <header
      ref={barRef}
      className={cx(
        'safe-t sticky top-0 z-50 w-full',
        'transition-[padding] duration-500 [transition-timing-function:var(--ease-glass)]',
        scrolled ? 'pt-2 pb-2' : 'pt-4 pb-3',
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

          {/* 搜索 */}
          <div className="relative min-w-0 flex-1">
            <label htmlFor="global-search" className="sr-only">
              搜索游戏（支持中文、拼音、英文名）
            </label>
            <IconSearch
              size={17}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--ink-4)]"
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
                'h-10 w-full rounded-[var(--radius-glass-sm)] pr-20 pl-10',
                'bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)]',
                'border border-[var(--line-1)] text-[14px] placeholder:text-[var(--ink-4)]',
                'transition-[background,border-color,box-shadow] duration-300',
                'focus:border-[var(--line-3)] focus:bg-[color-mix(in_srgb,var(--ink-1)_9%,transparent)]',
                'focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none',
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
                className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] hover:text-[var(--ink-1)]"
              >
                <IconClose size={15} />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--ink-4)] sm:block"
              >
                ⌘K
              </kbd>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <GlassButton
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
              title={isDark ? '浅色主题' : '深色主题'}
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </GlassButton>

            <Link to="/upload" aria-label="上传本地 ROM">
              <GlassButton variant="ghost" size="icon" title="上传本地 ROM" tabIndex={-1}>
                <IconUpload size={18} />
              </GlassButton>
            </Link>

            <Link to="/settings" aria-label="设置">
              <GlassButton variant="ghost" size="icon" title="设置" tabIndex={-1}>
                <IconSettings size={18} />
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
