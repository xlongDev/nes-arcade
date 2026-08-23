import { memo, useCallback, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Game } from '@/types/game'
import { GameCover } from './GameCover'
import { CardQuickMenu } from './CardQuickMenu'
import { IconHeart, IconPlay } from '@/components/ui/Icons'
import { useLibrary } from '@/stores/library'
import { useLongPress } from '@/lib/useLongPress'
import { cx } from '@/lib/cx'
import { CATEGORIES } from '@/data/games.meta'

const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]))

interface GameCardProps {
  game: Game
  index?: number
  /**
   * 首屏卡片：图片立即解码，并按顺序做交错入场。
   *
   * 注意这里的语义之前是反的 —— 原先是"非首屏才播 float-in"，
   * 可非首屏的卡片在 content-visibility 下压根没被看到过，
   * 等用户滚下去时动画早就播完了，等于白播；而真正被看到的首屏
   * 却是硬弹出。所以入场动画只给首屏，滚动区不浪费主线程。
   */
  eager?: boolean
}

export const GameCard = memo(function GameCard({
  game,
  index = 0,
  eager = false,
}: GameCardProps) {
  const favorite = useLibrary((s) => s.favorites.includes(game.id))
  const override = useLibrary((s) => s.coverOverrides[game.id])
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)

  const [pop, setPop] = useState(false)
  const onFav = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // 仅「收藏」瞬间弹一下；取消收藏不弹，避免视觉噪音
      if (!favorite) {
        setPop(true)
        window.setTimeout(() => setPop(false), 360)
      }
      toggleFavorite(game.id)
    },
    [game.id, toggleFavorite, favorite],
  )

  // 长按弹快速菜单:移动端主入口。鼠标右键作为桌面端的 a11y 备份路径同等触发。
  const [menu, setMenu] = useState<{
    open: boolean
    anchor: { x: number; y: number } | null
  }>({ open: false, anchor: null })
  const openMenu = useCallback(
    (x: number, y: number) => setMenu({ open: true, anchor: { x, y } }),
    [],
  )
  const closeMenu = useCallback(
    () => setMenu((s) => ({ open: false, anchor: s.anchor })),
    [],
  )
  const longPress = useLongPress({
    onLongPress: (origin) => openMenu(origin.x, origin.y),
  })
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      openMenu(e.clientX, e.clientY)
    },
    [openMenu],
  )

  return (
    <article
      data-fav={favorite ? 'true' : undefined}
      className="group relative"
    >
      <Link
        to="/play/$gameId"
        params={{ gameId: game.id }}
        viewTransition
        data-glow
        aria-label={`游玩 ${game.title}`}
        {...longPress}
        onContextMenu={onContextMenu}
        className={cx(
          'glass-faux glass-faux-hoverable glass-sheen glass-refract',
          // overflow-hidden 会把默认 :focus-visible 的外环(offset 2)裁掉,
          // 改用 .focus-ring-inset 把外环 inset 回去,WCAG 2.4.7 始终满足
          'focus-ring-inset',
          'relative block overflow-hidden rounded-[var(--radius-glass-md)]',
          'transition-[transform,box-shadow,border-color,filter] duration-[420ms]',
          '[transition-timing-function:var(--ease-glass)]',
          'hover:-translate-y-1.5 hover:shadow-[var(--drop-lg)] active:scale-[0.985]',
          eager && 'stagger-in',
          // 收藏卡片做克制的视觉强化:轻量玫瑰描边 + 微微提亮 +
          // 不抢戏的脉冲呼吸;hover 时 lift 继承
          favorite &&
            'border-[var(--color-rose)]/45 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-rose)_42%,transparent),0_8px_22px_-12px_color-mix(in_srgb,var(--color-rose)_46%,transparent)]',
        )}
        style={eager ? ({ '--i': index } as React.CSSProperties) : undefined}
      >
      {/* 封面：NES 卡带接近 1:1，这里用 4:3 更贴近游戏画面比例 */}
      <div className="relative aspect-4/3 overflow-hidden">
        <GameCover
          game={game}
          override={override}
          eager={eager}
          className="size-full transition-transform duration-[620ms] group-hover:scale-[1.06] [transition-timing-function:var(--ease-glass)]"
        />

        {/* hover 时浮出的播放按钮 */}
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-0 grid place-items-center',
            'opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
        >
          <span
            className={cx(
              'grid size-12 place-items-center rounded-full',
              'bg-white/18 backdrop-blur-md ring-1 ring-white/40',
              'shadow-[0_8px_28px_-10px_rgba(0,0,0,.7)]',
              'scale-75 transition-transform duration-[420ms] group-hover:scale-100',
              '[transition-timing-function:var(--ease-spring)]',
            )}
          >
            <IconPlay size={20} className="ml-0.5 text-white" />
          </span>
        </span>

        {/* 徽标：多合一 / 电池存档 */}
        <span className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
          {game.category === 'multicart' && <Badge tone="pink">多合一</Badge>}
          {game.hasBattery && <Badge tone="mint">电池存档</Badge>}
          {game.players >= 2 && <Badge>{game.players}P</Badge>}
        </span>

        {/* 标题压在封面底部，节省纵向空间 */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="truncate text-[13.5px] leading-snug font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]">
            {game.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/68">
            <span>{CAT_LABEL.get(game.category) ?? game.category}</span>
            {game.year && (
              <>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className="tnum">{game.year}</span>
              </>
            )}
          </p>
        </div>
      </div>
      </Link>

      {/* 收藏按钮与 Link 同级：避免 <a> 内嵌套 <button> 的非法 HTML，也理顺键盘 Tab 顺序
          （先到卡片链接，再到收藏按钮）。z-20 确保浮在封面之上。 */}
      <button
        type="button"
        onClick={onFav}
        aria-label={favorite ? `取消收藏 ${game.title}` : `收藏 ${game.title}`}
        aria-pressed={favorite}
        className={cx(
          'absolute top-2 right-2 z-20 grid size-8 place-items-center rounded-full',
          'bg-black/28 text-white/80 backdrop-blur-md ring-1 ring-white/22',
          'transition-[transform,color,background] duration-300 active:scale-90',
          'hover:bg-black/44 hover:text-white',
          favorite && 'text-[var(--color-rose)]',
          // 未收藏时在移动端也要看得见（没有 hover），只在桌面端淡出
          !favorite &&
            'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
        )}
      >
        <IconHeart size={15} filled={favorite} className={pop ? 'heart-pop' : undefined} />
      </button>

      <CardQuickMenu
        game={game}
        open={menu.open}
        anchor={menu.anchor}
        onClose={closeMenu}
      />
    </article>
  )
})

function Badge({ children, tone }: { children: React.ReactNode; tone?: 'pink' | 'mint' }) {
  return (
    <span
      className={cx(
        'rounded-full px-1.5 py-0.5 text-[9.5px] leading-[1.6] font-medium tracking-wide',
        'bg-black/34 text-white/88 ring-1 ring-white/20 backdrop-blur-md',
        tone === 'pink' && 'text-[#ffc7e6]',
        tone === 'mint' && 'text-[#a8f0dc]',
      )}
    >
      {children}
    </span>
  )
}
