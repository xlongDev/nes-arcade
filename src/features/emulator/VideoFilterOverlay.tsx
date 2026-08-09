import { cx } from '@/lib/cx'
import type { VideoFilter } from '@/stores/prefs'

/**
 * 视频滤镜叠层。Nostalgist 自身不提供运行时滤镜切换，
 * 这里用纯 CSS 在画面上方盖一层 scanline / CRT 效果，零额外性能开销。
 * 用 pointer-events-none，永不挡住输入。
 */
export function VideoFilterOverlay({ filter }: { filter: VideoFilter }) {
  if (filter === 'none') return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      {filter === 'scanline' && (
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 1px, transparent 1px, transparent 3px)',
          }}
        />
      )}
      {filter === 'crt' && (
        <>
          <div
            className="absolute inset-0 opacity-35 mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 2px, transparent 2px, transparent 4px)',
            }}
          />
          {/* 暗角 + 轻微 RGB 偏移，模拟 CRT 玻璃 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 120% at 50% 50%, transparent 58%, rgba(0,0,0,0.55) 100%)',
            }}
          />
          <div
            className={cx(
              'absolute inset-0 opacity-25 mix-blend-screen',
              'bg-[linear-gradient(90deg,rgba(255,0,0,.5),transparent_8%,transparent_92%,rgba(0,0,255,.5))]',
            )}
          />
        </>
      )}
    </div>
  )
}
