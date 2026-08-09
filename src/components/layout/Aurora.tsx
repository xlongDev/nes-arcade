import { memo } from 'react'
import { cx } from '@/lib/cx'

interface AuroraProps {
  /** 游戏运行时传 true：暂停漂移动画 + 压暗，把 GPU 让给模拟器 */
  paused?: boolean
}

/**
 * 极光背景。三团高斯模糊的色斑缓慢漂移，是整个玻璃系统的"光源"。
 * 没有它，玻璃会因为背后没内容而显得像灰色塑料。
 *
 * 成本控制：fixed + contain:strict + 只有 transform 动画（合成层，不触发重排）。
 */
export const Aurora = memo(function Aurora({ paused = false }: AuroraProps) {
  return (
    <>
      <div className={cx('aurora', paused && 'aurora-paused')} aria-hidden="true">
        <div
          className="aurora-blob"
          style={{
            width: '58vmax',
            height: '58vmax',
            left: '-8vw',
            top: '-14vh',
            background: 'var(--aurora-1)',
            animationDelay: '0s',
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: '52vmax',
            height: '52vmax',
            right: '-10vw',
            top: '6vh',
            background: 'var(--aurora-2)',
            animationDelay: '-9s',
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: '46vmax',
            height: '46vmax',
            left: '26vw',
            bottom: '-22vh',
            background: 'var(--aurora-3)',
            animationDelay: '-17s',
          }}
        />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  )
})
