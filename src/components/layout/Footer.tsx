import { Link } from '@tanstack/react-router'
import { cx } from '@/lib/cx'
import { IconGithub, IconUpload, IconSettings, IconGamepad } from '@/components/ui/Icons'

const REPO_URL = 'https://github.com/xlongDev/nes-arcade'

const footerLinks = [
  { to: '/upload', label: '上传 ROM', icon: IconUpload },
  { to: '/settings', label: '设置', icon: IconSettings },
]

const techTags = ['React 19', 'Vite 8', 'TypeScript 7', 'Tailwind CSS 4']

export function Footer() {
  return (
    <footer className="stack-page relative z-2 pb-[calc(env(safe-area-inset-bottom)_+_24px)] pt-6">
      <div
        className={cx(
          'glass-frame glass-refract glass-sheen',
          'flex flex-col items-center gap-5',
          'rounded-[var(--radius-glass-lg)] px-6 py-7',
          'shadow-[var(--drop-md)] [transform:translateZ(0)]',
          'sm:flex-row sm:justify-between sm:gap-6',
        )}
      >
        {/* 品牌区 */}
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Link
            to="/"
            search={{ q: '', cat: 'all', sort: 'title', dir: 'asc', fav: false, recent: false }}
            className="group flex items-center gap-2 text-[var(--ink-1)] transition-colors hover:text-[var(--color-brand)]"
          >
            <IconGamepad size={20} className="text-[var(--color-brand)]" />
            <span className="text-[15px] font-semibold tracking-tight">NES Arcade</span>
          </Link>
          <p className="max-w-[22ch] text-center text-[13px] leading-snug text-[var(--ink-3)] sm:text-left">
            液态玻璃质感的红白机游戏厅
          </p>
        </div>

        {/* 链接区 */}
        <nav aria-label="页脚导航" className="flex flex-wrap items-center justify-center gap-2">
          {footerLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-[var(--radius-glass-sm)]',
                'px-3 py-2 text-[13px] font-medium text-[var(--ink-2)]',
                'border border-transparent',
                'transition-[background,color,transform] duration-300',
                '[transition-timing-function:var(--ease-glass)]',
                'hover:bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)] hover:text-[var(--ink-1)]',
                'active:scale-[0.965]',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-[var(--radius-glass-sm)]',
              'px-3 py-2 text-[13px] font-medium text-[var(--ink-2)]',
              'border border-transparent',
              'transition-[background,color,transform] duration-300',
              '[transition-timing-function:var(--ease-glass)]',
              'hover:bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)] hover:text-[var(--ink-1)]',
              'active:scale-[0.965]',
            )}
          >
            <IconGithub size={16} />
            GitHub
          </a>
        </nav>

        {/* 版权与技术栈 */}
        <div className="flex flex-col items-center gap-2.5 sm:items-end">
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
            {techTags.map((tag) => (
              <span
                key={tag}
                className={cx(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  'text-[var(--ink-3)]',
                  'border border-[var(--line-1)]',
                  'bg-[color-mix(in_srgb,var(--ink-1)_4%,transparent)]',
                )}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[var(--ink-3)]">
            © {new Date().getFullYear()} xlongDev · GPL-3.0-or-later
          </p>
        </div>
      </div>
    </footer>
  )
}
