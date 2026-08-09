import { memo, useEffect, useMemo, useState } from 'react'
import type { Game } from '@/types/game'
import { coverPalette, coverGlyph, coverPixels } from '@/lib/cover'
import { cx } from '@/lib/cx'

interface GameCoverProps {
  game: Game
  /** 用户截图 / 上传的覆盖封面（dataURL） */
  override?: string
  className?: string
  /** 大图模式（游戏页 hero）字号更大 */
  large?: boolean
  eager?: boolean
}

/**
 * 封面三层递进：
 *   override（自动截图 / 手动上传） → 抓取到的真封面 → 程序化玻璃封面
 * 程序化封面是纯 CSS + 一点 SVG，零网络请求，所以列表永远不会开天窗。
 */
export const GameCover = memo(function GameCover({
  game,
  override,
  className,
  large = false,
  eager = false,
}: GameCoverProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const palette = useMemo(() => coverPalette(game.title, game.category), [game.title, game.category])
  const glyph = useMemo(() => coverGlyph(game.title), [game.title])
  const pixels = useMemo(() => coverPixels(game.title), [game.title])

  const src = override ?? (game.cover ? `./${game.cover}` : null)
  const showImage = Boolean(src) && !imgFailed

  // 封面地址变化（如截图更新）时重置加载态，重新走一次 shimmer
  useEffect(() => {
    setLoaded(false)
  }, [src])

  return (
    <div
      className={cx('relative isolate overflow-hidden', className)}
      style={{
        background: `linear-gradient(152deg, ${palette.from}, ${palette.to})`,
      }}
    >
      {showImage ? (
        <>
          {/* 图片解码完成前显示骨架微光，避免"啪"地一下弹出 */}
          {!loaded && <span aria-hidden="true" className="cover-shimmer absolute inset-0" />}
          <img
            src={src as string}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setImgFailed(true)}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 size-full object-cover"
            style={{ imageRendering: override ? 'pixelated' : 'auto' }}
          />
        </>
      ) : (
        <>
          {/* 主字形：大而虚，作为底纹而不是主角 */}
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-0 grid place-items-center font-semibold tracking-tighter',
              'text-white/22 mix-blend-overlay select-none',
              large ? 'text-[26cqw]' : 'text-[38cqw]',
            )}
            style={{ containerType: 'inline-size' }}
          >
            {glyph}
          </span>

          {/* 5×5 对称点阵，像卡带贴纸上的印刷图案 */}
          <svg
            aria-hidden="true"
            viewBox="0 0 5 5"
            className="absolute right-[7%] bottom-[7%] w-[26%] opacity-55 mix-blend-soft-light"
          >
            {pixels.map((on, i) =>
              on ? (
                <rect
                  key={i}
                  x={i % 5}
                  y={Math.floor(i / 5)}
                  width="0.86"
                  height="0.86"
                  rx="0.16"
                  fill="#fff"
                />
              ) : null,
            )}
          </svg>

          {/* 斜向高光，制造"塑料卡带在灯下"的反光 */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(128deg,rgba(255,255,255,.34),transparent_42%,transparent_68%,rgba(0,0,0,.22))]"
          />
        </>
      )}

      {/* 底部压暗，保证卡片标题在任何封面上都可读（对比度 ≥ 4.5:1） */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(4,6,14,.82),transparent)]"
      />
    </div>
  )
})
