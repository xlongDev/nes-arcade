import { useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { IconSearch, IconClose } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'
import type { LibrarySearch } from '@/router'

interface GlobalSearchProps {
  size?: 'md' | 'lg'
  className?: string
}

/**
 * 全局游戏搜索框。现位于游戏库工具栏左侧。
 * 负责与 URL search.q 双向同步（防抖 160ms、replace 避免历史堆积），
 * 并接管 ⌘K / Ctrl+K / 斜杠聚焦、Esc 清空等快捷交互。
 */
export function GlobalSearch({ size = 'md', className }: GlobalSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const urlQuery = useRouterState({
    select: (s) => ((s.location.search as { q?: string }).q ?? ''),
  })
  const currentSearch = useRouterState({
    select: (s) => s.location.search as LibrarySearch,
  })
  const [draft, setDraft] = useState(urlQuery)
  const [focused, setFocused] = useState(false)

  // URL 变化（后退、点分类、清空）时把输入框拉回同步
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

  const h = size === 'lg' ? 'h-12' : 'h-11'
  const textSize = size === 'lg' ? 'text-[15px]' : 'text-[14px]'
  const iconSize = size === 'lg' ? 19 : 17

  return (
    <div className={cx('relative w-full', className)}>
      <label htmlFor="global-search" className="sr-only">
        搜索游戏（支持中文、拼音、英文名）
      </label>
      {/*
        液态玻璃胶囊：与 Segmented / CategoryFilter 同一视觉语言。
        Focus 状态做内敛处理：
        - 不添加外扩 ring / 外发光（避免截图里的"大方框"）
        - 仅 border 变品牌色、搜索图标变品牌色、背景微微提亮
        - 内部 input 的光标和占位符保持原有对比度
      */}
      <div
        className={cx(
          'glass-faux glass-refract flex items-center rounded-[var(--radius-glass-md)]',
          'border bg-[var(--glass-card)]',
          'transition-[border-color,background-color] duration-200 [transition-timing-function:var(--ease-glass)]',
          // 彻底关闭浏览器默认 focus outline / ring / shadow，避免 rounded 胶囊外出现大方框
          '!outline-0 focus-within:!outline-0 focus-within:!ring-0 focus-within:!shadow-none',
          focused
            ? 'border-[color-mix(in_srgb,var(--color-brand)_70%,transparent)] bg-[color-mix(in_srgb,var(--bg-base)_76%,transparent)]'
            : 'border-[var(--line-1)] hover:border-[color-mix(in_srgb,var(--ink-1)_22%,transparent)]',
          h,
        )}
        style={{ outline: 'none', boxShadow: 'none' }}
      >
        <IconSearch
          size={iconSize}
          className={cx(
            'ml-3 shrink-0 transition-colors duration-200',
            focused ? 'text-[var(--color-brand)]' : 'text-[var(--ink-4)]',
          )}
        />
        <input
          id="global-search"
          ref={inputRef}
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="搜索游戏"
          autoComplete="off"
          spellCheck={false}
          className={cx(
            'min-w-0 flex-1 bg-transparent px-3',
            h,
            textSize,
            'text-[var(--ink-1)] placeholder:text-[var(--ink-4)]',
            // 用 !important 级工具彻底压制浏览器默认 focus-visible 大方框
            '!outline-0 focus:!outline-0 focus-visible:!outline-0',
            '!ring-0 focus:!ring-0 focus-visible:!ring-0',
            '!shadow-none focus:!shadow-none focus-visible:!shadow-none',
            '[-webkit-tap-highlight-color:transparent]',
            '[&::-webkit-search-cancel-button]:hidden',
          )}
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        {draft ? (
          <button
            type="button"
            onClick={() => {
              setDraft('')
              inputRef.current?.focus()
            }}
            aria-label="清空搜索"
            className="mr-1.5 grid size-7 place-items-center rounded-full text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] hover:text-[var(--ink-1)]"
          >
            <IconClose size={15} />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="mr-3 hidden rounded-md border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] px-1.5 py-px font-mono text-[10.5px] text-[var(--ink-4)] sm:block"
          >
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  )
}
