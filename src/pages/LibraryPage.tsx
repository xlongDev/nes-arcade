import { useMemo, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Segmented } from '@/components/ui/Segmented'
import { GlassButton } from '@/components/ui/GlassButton'
import { GameCard } from '@/features/library/GameCard'
import { useGameSearch } from '@/features/library/useGameSearch'
import { useLibrary } from '@/stores/library'
import { useGridPointerGlow } from '@/lib/pointer'
import { CATEGORIES } from '@/data/games.meta'
import { CATEGORY_COUNTS, getGame, TOTAL_BYTES } from '@/data/games'
import { formatBytes } from '@/lib/format'
import { IconHeart, IconClock, IconSparkle, IconSearch } from '@/components/ui/Icons'
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
        label: (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-[var(--ink-3)]">{c.icon}</span>
            {c.label}
          </span>
        ),
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
      <div className="sticky top-[88px] z-30 -mx-1 mb-7 flex flex-col gap-3 rounded-[var(--radius-glass-lg)] px-1 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Segmented
              label="游戏分类"
              value={search.cat}
              options={categoryOptions}
              onChange={(v) => setSearch({ cat: v })}
            />
          </div>
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
          <div className="flex items-center gap-2">
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
          {recentGames.map((g) => (
            <GameCard key={g!.id} game={g!} />
          ))}
        </Rail>
      )}

      {/* 我的收藏 */}
      {showRails && favoriteGames.length > 0 && (
        <Rail title="我的收藏" icon={<IconHeart size={15} />}>
          {favoriteGames.map((g) => (
            <GameCard key={g!.id} game={g!} />
          ))}
        </Rail>
      )}

      {/* 结果网格 */}
      {games.length === 0 ? (
        <EmptyState
          onReset={() => setSearch({ q: '', cat: 'all', fav: false })}
        />
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
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        <span aria-hidden className="text-[var(--color-brand)]">{icon}</span>
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
