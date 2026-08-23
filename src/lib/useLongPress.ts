import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface LongPressPoint {
  x: number
  y: number
}

export interface UseLongPressOptions {
  /** 触发时长,ms。默认 480,符合「按住一会儿」的直觉。 */
  delay?: number
  /** 移动超过这个像素数就取消(避免拖动误触)。默认 12。 */
  threshold?: number
  /** 长按触发时回调;origin 为按下时的 client 坐标,可用于 popover 定位。 */
  onLongPress: (origin: LongPressPoint, event: ReactPointerEvent) => void
  /** 临时禁用;会清掉已启动的 timer,但仍保留绑定让上层继续往下传 click。 */
  disabled?: boolean
}

/**
 * 长按手势 hook。
 *
 * 几个细节:
 * - pointerdown / move / up + pointerId 把触屏和鼠标统一处理,避免 touch / mouse 双套事件。
 * - 鼠标右键不触发,留给浏览器菜单(桌面端 a11y 路径)。
 * - 移动超过 threshold 立即取消,防止拖动 / 滚动时误触。
 * - 这里不阻止默认 click —— 上层 GameCard 用 stopPropagation 截走点击,
 *   让 Link 该跳转的逻辑保持工作,长按只是「叠」一个菜单入口。
 */
export function useLongPress({
  delay = 480,
  threshold = 12,
  onLongPress,
  disabled = false,
}: UseLongPressOptions) {
  const cb = useRef(onLongPress)
  useEffect(() => {
    cb.current = onLongPress
  }, [onLongPress])

  const state = useRef<{
    timer: number | null
    startX: number
    startY: number
    pointerId: number | null
  }>({ timer: null, startX: 0, startY: 0, pointerId: null })

  const clear = useCallback(() => {
    if (state.current.timer != null) {
      window.clearTimeout(state.current.timer)
      state.current.timer = null
    }
  }, [])

  useEffect(
    () => () => {
      clear()
    },
    [clear],
  )

  return useMemo(
    () => ({
      onPointerDown(e: ReactPointerEvent) {
        if (disabled) {
          clear()
          return
        }
        if (e.pointerType === 'mouse' && e.button !== 0) return
        clear()
        state.current.startX = e.clientX
        state.current.startY = e.clientY
        state.current.pointerId = e.pointerId
        state.current.timer = window.setTimeout(() => {
          state.current.timer = null
          cb.current({ x: e.clientX, y: e.clientY }, e)
        }, delay)
      },
      onPointerMove(e: ReactPointerEvent) {
        if (state.current.timer == null) return
        const dx = e.clientX - state.current.startX
        const dy = e.clientY - state.current.startY
        if (Math.hypot(dx, dy) > threshold) clear()
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
    }),
    [delay, threshold, disabled, clear],
  )
}
