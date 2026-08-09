import { useMemo, useRef } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Segmented } from '@/components/ui/Segmented'
import { CategoryFilter as CategoryFilterChips } from '@/components/ui/CategoryFilter'
import { GlassButton } from '@/components/ui/GlassButton'
import { GameCard } from '@/features/library/GameCard'
import { useGameSearch } from '@/features/library/useGameSearch'
import { useLibrary } from '@/stores/library'
import { useGridPointerGlow } from '@/lib/pointer'
import { CATEGORIES } from '@/data/games.meta'
import { CATEGORY_COUNTS, getGame, TOTAL_BYTES } from '@/data/games'
import { formatBytes } from '@/lib/format'
import { IconHeart, IconClock, IconSparkle, IconSearch, IconUpload } from '@/components/ui/Icons'
import type { CategoryFilter } from '@/types/game'
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
    category: 'action' as const,
    players: 1 as const,
    desc: '本地上传的 ROM',
    alias: [],
    featured: false,
    pinyin: '',
    initials: '',
    haystack: c.title.toLowerCase(),
    isCustom: true,
  })))

  const categoryOptions = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        value: c.id as CategoryFilter,
        label: c.label,
        icon: c.icon,
        count: CATEGORY_COUNTS[c.id] ?? 0,
      })),
    [],
  )

  const recentGames = useMemo(
    () => recents.map((r) => getGame(r.gameId)).filter(Boolean).slice(0, 12),
    [recents],
  )
  const favoriteGames = useMemo(
    () => favorites.map((id) => getGame(id)).filter(Boolean).slice(0, 12),
    [favorites],
  )

  const setSearch = (patch: Partial<LibrarySearch>) =>
    void navigate({ to: '/', search: () => ({ ...search, ...patch }) })

  const showRails = !search.q && search.cat === 'all' && !search.fav

  // 真正"空库"（没有任何内置 ROM 也没有上传 ROM）与"筛选后为零"要区别对待：
  // 前者需要引导用户添加 ROM，后者只需重置筛选。
  const hasAnyGame = (CATEGORY_COUNTS.all ?? 0) > 0 || customGames.length > 0

  return (
    <div className="stack-page pb-28">
      {/* Hero */}
      <header className="pt-8 pb-6 sm:pt-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          游戏库
          <span className="ml-2 align-middle text-base font-normal text-[var(--ink-3)]">
            {CATEGORY_COUNTS.all} 款 · {formatBytes(TOTAL_BYTES)}
          </span>
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-[var(--ink-3)]">
          点开即玩，进度与存档都留在本地。支持中文 / 拼音 / 英文名搜索，右上角还能上传自己的卡带。
        </p>
      </header>

      {/* 工具栏：分类筛选 + 排序 + 收藏 */}
      <div className="sticky top-[calc(env(safe-area-inset-top)_+_92px)] z-30 -mx-1 mb-7 flex flex-col gap-3 rounded-[var(--radius-glass-lg)] px-1 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <CategoryFilterChips
              label="游戏分类"
              value={search.cat}
              options={categoryOptions}
              onChange={(v) => setSearch({ cat: v as CategoryFilter })}
            />
          </div>

          {/* 排序：大屏并入同一行右侧；移动端单独放第二行（见下方） */}
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
            variant={search.fav ? 'primary' : 'glass'}
            size="md"
            active={search.fav}
            onClick={() => setSearch({ fav: !search.fav })}
            aria-label="只看收藏"
            title="只看收藏"
          >
            <IconHeart size={16} filled={search.fav} />
            <span className="hidden sm:inline">收藏</span>
          </GlassButton>
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
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-[var(--ink-2)]">
        <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-[var(--color-brand)]" />
        <span aria-hidden className="text-[var(--ink-3)]">{icon}</span>
        {title}
      </h2>
      <div className="rail">{children}</div>
    </section>
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
