import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Segmented } from '@/components/ui/Segmented'
import { CategoryFilter as CategoryFilterChips } from '@/components/ui/CategoryFilter'
import { GlassButton } from '@/components/ui/GlassButton'
import { GameCard } from '@/features/library/GameCard'
import { useGameSearch } from '@/features/library/useGameSearch'
import { useLibrary } from '@/stores/library'
import { useGridPointerGlow } from '@/lib/pointer'
import { cx } from '@/lib/cx'
import { CATEGORIES } from '@/data/games.meta'
import { CATEGORY_COUNTS, GAMES, getGame, TOTAL_BYTES } from '@/data/games'
import { formatBytes } from '@/lib/format'
import { IconHeart, IconClock, IconSparkle, IconSearch, IconUpload, IconGamepad } from '@/components/ui/Icons'
import type { Category, CategoryFilter } from '@/types/game'
import type { LibrarySearch, SortKey } from '@/router'

const SORT_OPTIONS = [
  { value: 'title' as SortKey, label: '名称' },
  { value: 'year' as SortKey, label: '年代' },
  { value: 'size' as SortKey, label: '体积' },
  { value: 'recent' as SortKey, label: '最近' },
]

export function LibraryPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/' }) as LibrarySearch
  const gridRef = useRef<HTMLDivElement>(null)
  useGridPointerGlow(gridRef)

  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)
  const customGames = useLibrary((s) => s.customGames)

  const games = useGameSearch(search, customGames.map((c) => ({
    id: c.id,
    title: c.title,
    file: '',
    fileName: c.title,
    bytes: c.bytes,
    cover: null,
    mapper: c.mapper,
    prgKb: 0,
    chrKb: 0,
    hasBattery: false,
    hasTrainer: false,
    mirroring: 'horizontal' as const,
    format: 'iNES' as const,
    category: c.category ?? 'action',
    players: 1 as const,
    desc: '本地上传的 ROM',
    alias: [],
    featured: false,
    pinyin: '',
    initials: '',
    haystack: c.title.toLowerCase(),
    isCustom: true,
  })))

  // 根据当前库里实际存在的分类动态生成筛选选项（空分类不显示），"全部"始终保留。
  // 旧版 localStorage 里的 custom 游戏可能没 category 字段，兜底按 action 计。
  const activeCategories = useMemo(() => {
    const set = new Set<Category>()
    for (const g of GAMES) set.add(g.category)
    for (const c of customGames) set.add(c.category ?? 'action')
    return set
  }, [customGames])

  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = { ...CATEGORY_COUNTS }
    for (const c of customGames) {
      const cat = c.category ?? 'action'
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    counts.all = (counts.all ?? 0) + customGames.length
    return CATEGORIES.filter((c) => c.id === 'all' || activeCategories.has(c.id as Category)).map(
      (c) => ({
        value: c.id as CategoryFilter,
        label: c.label,
        icon: c.icon,
        count: counts[c.id] ?? 0,
      }),
    )
  }, [customGames, activeCategories])

  // 如果当前筛选的分类已经不存在（比如删掉了该分类下所有游戏），自动切回全部，避免空结果。
  useEffect(() => {
    if (search.cat !== 'all' && !activeCategories.has(search.cat)) {
      setSearch({ cat: 'all' })
    }
  }, [search.cat, activeCategories])

  // 切换分类 / 收藏筛选时，让结果网格整体轻量淡入上移（grid-refresh），柔化新旧结果的切换。
  // 用 layout effect 在绘制前重播动画，避免先闪出新内容再补动画；首屏不播。
  // 不重挂载网格，指针光晕的 ref 不丢、布局也不抖。
  const firstRender = useRef(true)
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const el = gridRef.current
    if (!el) return
    el.classList.remove('grid-refresh')
    void el.offsetWidth // 强制回流，确保移除后再添加能重启动画
    el.classList.add('grid-refresh')
  }, [search.cat, search.fav])

  const recentGames = useMemo(
    () => recents.map((r) => getGame(r.gameId)).filter(Boolean).slice(0, 12),
    [recents],
  )
  const favoriteGames = useMemo(
    () => favorites.map((id) => getGame(id)).filter(Boolean).slice(0, 12),
    [favorites],
  )

  // 英雄区的总数与总体积也要把上传游戏算进去
  const customBytes = useMemo(
    () => customGames.reduce((s, c) => s + c.bytes, 0),
    [customGames],
  )
  const totalCount = (CATEGORY_COUNTS.all ?? 0) + customGames.length
  const totalBytes = TOTAL_BYTES + customBytes

  const setSearch = (patch: Partial<LibrarySearch>) =>
    void navigate({ to: '/', search: () => ({ ...search, ...patch }) })

  // sticky 吸附态检测：滚动到工具栏吸顶时再加一层极淡的玻璃+底线，
  // 避免常态下分类区底下多一层厚重面板；吸顶时又能和内容拉开层次。
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        setIsStuck(!entry.isIntersecting)
      },
      { root: null, rootMargin: '-1px 0px 0px 0px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const showRails = !search.q && search.cat === 'all' && !search.fav

  // 真正"空库"（没有任何内置 ROM 也没有上传 ROM）与"筛选后为零"要区别对待：
  // 前者需要引导用户添加 ROM，后者只需重置筛选。
  const hasAnyGame = (CATEGORY_COUNTS.all ?? 0) > 0 || customGames.length > 0

  return (
    <div className="stack-page pb-28">
      {/* Hero */}
      <header className="float-in relative flex items-start gap-4 pb-7 pt-8 sm:gap-5 sm:pt-12">
        <div
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-glass-sm)] border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[var(--bevel-soft)] sm:size-14"
        >
          <PixelConsole className="size-7 sm:size-8" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">游戏库</h1>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] px-3 py-1 text-[13px] text-[var(--ink-2)]">
              <IconGamepad size={14} className="text-[var(--ink-3)]" />
              <span className="tnum">{totalCount} 款</span>
              <span className="text-[var(--ink-4)]">·</span>
              <span className="tnum">{formatBytes(totalBytes)}</span>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-[var(--ink-4)]">
            点开即玩，进度与存档都留在本机 · 支持中 / 拼音 / 英文搜索
          </p>
        </div>
      </header>

      {/* sticky 吸附 sentinel：位于工具栏正上方，用于判断工具栏是否已吸顶 */}
      <div ref={sentinelRef} className="pointer-events-none h-0" aria-hidden="true" />

      {/* 工具栏：分类筛选 + 排序 + 收藏 */}
      {/* 常态下无玻璃底板，pill 直接浮在页面背景上；吸顶时才出现极淡玻璃+底线。 */}
      <div
        className={cx(
          'sticky top-[calc(env(safe-area-inset-top)_+_92px)] z-30 -mx-1 mb-7 flex flex-col gap-3 px-1 py-2 transition-[background,border,box-shadow,backdrop-filter] duration-300 [transition-timing-function:var(--ease-glass)]',
          isStuck && 'border-b border-[var(--line-1)] bg-[color-mix(in_srgb,var(--bg-base)_72%,transparent)] backdrop-blur-xl',
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <CategoryFilterChips
              label="游戏分类"
              value={search.cat}
              options={categoryOptions}
              onChange={(v) => setSearch({ cat: v as CategoryFilter })}
            />
          </div>

          {/* 排序 + 收藏归到右侧操作组；大屏并入同一行，移动端排序单独放第二行 */}
          <div className="ml-auto flex items-center gap-2">
            {!search.fav && (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="text-[12px] text-[var(--ink-4)]">排序</span>
                <Segmented
                  label="排序方式"
                  size="sm"
                  value={search.sort}
                  options={SORT_OPTIONS}
                  onChange={(v) => setSearch({ sort: v })}
                />
              </div>
            )}

            <GlassButton
              variant="glass"
              size="md"
              active={search.fav}
              onClick={() => setSearch({ fav: !search.fav })}
              aria-label="只看收藏"
              title="只看收藏"
              className={cx(
                'transition-[color,background-color,border-color] duration-300 [transition-timing-function:var(--ease-glass)]',
                search.fav &&
                  'border-[color-mix(in_srgb,var(--color-rose)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-rose)_12%,transparent)] text-[var(--color-rose)]',
              )}
            >
              <IconHeart size={16} filled={search.fav} />
              <span className="hidden sm:inline">收藏</span>
            </GlassButton>
          </div>
        </div>

        {!search.fav && (
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[12px] text-[var(--ink-4)]">排序</span>
            <Segmented
              label="排序方式"
              size="sm"
              value={search.sort}
              options={SORT_OPTIONS}
              onChange={(v) => setSearch({ sort: v })}
            />
          </div>
        )}
      </div>

      {/* 最近游玩 */}
      {showRails && recentGames.length > 0 && (
        <Rail title="最近游玩" icon={<IconClock size={15} />}>
          {recentGames.map((g, i) => (
            <GameCard key={g!.id} game={g!} index={i} eager />
          ))}
        </Rail>
      )}

      {/* 我的收藏 */}
      {showRails && favoriteGames.length > 0 && (
        <Rail title="我的收藏" icon={<IconHeart size={15} />}>
          {favoriteGames.map((g, i) => (
            <GameCard key={g!.id} game={g!} index={i} eager />
          ))}
        </Rail>
      )}

      {/* 结果网格 */}
      {games.length === 0 ? (
        hasAnyGame ? (
          <EmptyState onReset={() => setSearch({ q: '', cat: 'all', fav: false })} />
        ) : (
          <LibraryEmptyGuide />
        )
      ) : (
        <div ref={gridRef} className="card-grid grid-perf mt-2">
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} eager={i < 12} />
          ))}
        </div>
      )}
    </div>
  )
}

function Rail({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[12.5px] font-semibold text-[var(--ink-4)]">
        <span aria-hidden className="text-[var(--ink-3)]">
          {icon}
        </span>
        {title}
      </h2>
      <div className="rail">{children}</div>
    </section>
  )
}

/**
 * 像素风 NES 手柄图标，作标题区视觉锚点。
 * crispEdges 保硬边，不喧宾夺主（颜色走品牌色、由父级控透明度）。
 */
function PixelConsole({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      shapeRendering="crispEdges"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1.5" y="3.5" width="21" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
      {/* 十字方向键 */}
      <rect x="4" y="6.5" width="2" height="4" fill="currentColor" />
      <rect x="3" y="7.5" width="4" height="2" fill="currentColor" />
      {/* A / B 按钮（像素方块） */}
      <rect x="16" y="6" width="2" height="2" fill="currentColor" />
      <rect x="19" y="8" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="glass-faux mt-6 flex flex-col items-center gap-4 rounded-[var(--radius-glass-lg)] px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)] text-[var(--ink-3)]">
        <IconSearch size={24} />
      </span>
      <div>
        <p className="text-[15px] font-semibold">没有匹配的游戏</p>
        <p className="mt-1 text-[13px] text-[var(--ink-3)]">换个关键词，或者清空筛选条件试试。</p>
      </div>
      <GlassButton variant="glass" onClick={onReset}>
        <IconSparkle size={16} />
        重置筛选
      </GlassButton>
    </div>
  )
}

/**
 * 全新克隆、尚未放入任何 ROM 时的引导页。
 * 与 README 的"三种获取方式"保持一致：网页上传 / 批量导入 / 合法来源。
 * 只有真正空库（hasAnyGame === false）才渲染，避免和"筛选后为零"的 EmptyState 混淆。
 */
function LibraryEmptyGuide() {
  return (
    <div className="glass-faux mt-6 flex flex-col items-center gap-5 rounded-[var(--radius-glass-lg)] px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] text-[var(--color-brand)]">
        <IconUpload size={28} />
      </span>
      <div>
        <p className="text-[17px] font-semibold">游戏库还是空的</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-[var(--ink-3)]">
          本合集不含任何游戏 ROM，需要你提供自己的卡带。三种方式任选其一：
        </p>
      </div>
      <ol className="grid w-full max-w-md gap-2 text-left">
        <li className="flex items-start gap-3 rounded-[var(--radius-glass-md)] border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_4%,transparent)] p-3">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] text-[12px] font-semibold text-white">
            1
          </span>
          <div>
            <p className="text-[13px] font-medium">网页上传</p>
            <p className="text-[12px] text-[var(--ink-3)]">在上传页直接拖入或选择 .nes 文件，立刻就能玩。</p>
            <Link
              to="/upload"
              className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand)] hover:underline"
            >
              <IconUpload size={13} /> 前往上传页
            </Link>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-[var(--radius-glass-md)] border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_4%,transparent)] p-3">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] text-[12px] font-semibold text-white">
            2
          </span>
          <div>
            <p className="text-[13px] font-medium">批量导入</p>
            <p className="text-[12px] text-[var(--ink-3)]">
              把 ROM 放进项目根目录的{' '}
              <code className="rounded bg-[color-mix(in_srgb,var(--ink-1)_12%,transparent)] px-1.5 py-0.5 font-mono text-[11px]">
                roms/
              </code>{' '}
              文件夹，再运行{' '}
              <code className="rounded bg-[color-mix(in_srgb,var(--ink-1)_12%,transparent)] px-1.5 py-0.5 font-mono text-[11px]">
                npm run prepare:data
              </code>{' '}
              即可批量收录。
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-[var(--radius-glass-md)] border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_4%,transparent)] p-3">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] text-[12px] font-semibold text-white">
            3
          </span>
          <div>
            <p className="text-[13px] font-medium">合法来源</p>
            <p className="text-[12px] text-[var(--ink-3)]">
              只添加你拥有版权的 ROM、自制游戏，或自有卡带的备份。
            </p>
          </div>
        </li>
      </ol>
    </div>
  )
}
