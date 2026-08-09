import { useEffect, type RefObject } from 'react'

/**
 * 指针跟随高光。
 *
 * 性能纪律：
 *  - 每帧最多写一次 CSS 变量（rAF 合并），杜绝 pointermove 里同步读布局
 *  - 网格版用「事件委托 + 只更新当前 hover 的那一张」，
 *    85 张卡片共用 1 个监听器，而不是 85 个
 *  - 触摸设备直接跳过：手指没有 hover，白白耗电
 */

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 单个元素的高光（用于顶部栏、游戏页大面板这类常驻元素） */
export function usePointerGlow<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || !canHover() || reduceMotion()) return

    let raf = 0
    let px = 0
    let py = 0

    const flush = () => {
      raf = 0
      el.style.setProperty('--mx', `${px}%`)
      el.style.setProperty('--my', `${py}%`)
    }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      px = ((e.clientX - r.left) / r.width) * 100
      py = ((e.clientY - r.top) / r.height) * 100
      if (!raf) raf = requestAnimationFrame(flush)
    }

    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      el.style.setProperty('--mx', '50%')
      el.style.setProperty('--my', '0%')
    }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [ref])
}

/**
 * 网格版：事件委托。
 * @param selector 卡片选择器，命中的元素才会被写入高光变量
 */
export function useGridPointerGlow<T extends HTMLElement>(
  ref: RefObject<T | null>,
  selector = '[data-glow]',
) {
  useEffect(() => {
    const root = ref.current
    if (!root || !canHover() || reduceMotion()) return

    let active: HTMLElement | null = null
    let raf = 0
    let px = 50
    let py = 0

    const flush = () => {
      raf = 0
      if (!active) return
      active.style.setProperty('--mx', `${px}%`)
      active.style.setProperty('--my', `${py}%`)
    }

    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(selector) ?? null

      if (target !== active) {
        // 离开旧卡片时把高光归位，避免留下一块"卡住的亮斑"
        active?.style.setProperty('--mx', '50%')
        active?.style.setProperty('--my', '0%')
        active = target
      }
      if (!active) return

      const r = active.getBoundingClientRect()
      px = ((e.clientX - r.left) / r.width) * 100
      py = ((e.clientY - r.top) / r.height) * 100
      if (!raf) raf = requestAnimationFrame(flush)
    }

    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      active?.style.setProperty('--mx', '50%')
      active?.style.setProperty('--my', '0%')
      active = null
    }

    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [ref, selector])
}
