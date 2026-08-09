import { useEffect, useId, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { GlassPanel } from './GlassPanel'
import { IconClose } from './Icons'
import { cx } from '@/lib/cx'

/**
 * 模态对话框。
 *
 * 之前存档面板是页面里手写的一坨 fixed div —— 没有 role=dialog，
 * 焦点不锁，Tab 能跑到背后的页面上，关掉之后焦点也不回来。
 * 键盘和读屏用户基本没法用。这里一次性把这些补齐：
 *
 *   · role=dialog + aria-modal + aria-labelledby（读屏能正确播报）
 *   · 焦点陷阱：Tab / Shift+Tab 在面板内循环（WCAG 2.4.3）
 *   · 打开时记住来源元素，关闭后把焦点还回去
 *   · Esc 关闭，走 capture 阶段抢在页面级快捷键前面
 *   · 背景滚动锁，且补偿滚动条宽度，避免锁的瞬间整页横跳
 *
 * 动效在 glass.css：桌面中心浮起、移动端底部抽屉。
 * reduced-motion 由 glass.css 的全局降级兜底，这里不用重复判断。
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** 同时开多个对话框时，滚动锁要计数，否则关掉上层就把锁提前解了 */
let lockCount = 0

function lockScroll() {
  if (lockCount++ > 0) return
  const gap = window.innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  if (gap > 0) document.body.style.paddingRight = `${gap}px`
}

function unlockScroll() {
  if (--lockCount > 0) return
  lockCount = 0
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
}

export interface GlassDialogProps {
  open: boolean
  onClose: () => void
  /** 标题文本。同时用作 aria-labelledby 的内容，必填。 */
  title: string
  icon?: ReactNode
  /** 补充说明，会挂到 aria-describedby 上 */
  description?: ReactNode
  size?: 'sm' | 'md'
  /** 关掉右上角的 × —— 只在有明确操作按钮的确认框里这么做 */
  hideClose?: boolean
  children?: ReactNode
  footer?: ReactNode
}

const SIZE = {
  sm: 'max-w-sm',
  md: 'max-w-md',
} as const

export function GlassDialog({
  open,
  onClose,
  title,
  icon,
  description,
  size = 'md',
  hideClose = false,
  children,
  footer,
}: GlassDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`

  // 移动端底部 sheet 的下滑关闭手势
  const [drag, setDrag] = useState<{ y: number; dragging: boolean }>({ y: 0, dragging: false })
  const dragStartY = useRef(0)

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // 只在移动端底部 sheet 启用；桌面端是居中模态，不响应下滑
    if (window.matchMedia('(min-width: 640px)').matches) return
    dragStartY.current = e.clientY
    setDrag({ y: 0, dragging: true })
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.dragging) return
    setDrag({ y: Math.max(0, e.clientY - dragStartY.current), dragging: true })
  }
  const onHandleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.dragging) return
    const dy = Math.max(0, e.clientY - dragStartY.current)
    setDrag({ y: 0, dragging: false })
    if (dy > 120) onClose()
  }

  // 焦点接管 + 归还
  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    lockScroll()

    // 等一帧，确保入场动画开始后元素已经可聚焦
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus({ preventScroll: true })
    })

    return () => {
      cancelAnimationFrame(raf)
      unlockScroll()
      // 来源元素可能已经被卸载（比如删完存档整行没了），此时不强行还原
      const el = restoreRef.current
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [open])

  // Esc 关闭 + Tab 陷阱
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      )
      if (!items.length) {
        e.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }

      const first = items[0] as HTMLElement
      const last = items[items.length - 1] as HTMLElement
      const active = document.activeElement

      // 焦点已经跑到面板外（浏览器 UI 绕回来的情况），直接抓回来
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
        return
      }
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    // capture：抢在 PlayPage 的全局快捷键之前，避免 Esc 被吃掉
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="dialog-scrim fixed inset-0 z-[90] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      // 只认"按下"就在遮罩上的情况。否则在面板里拖选文字、松手落到遮罩上会误关。
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <GlassPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        radius="xl"
        sheen
        className={cx(
          'dialog-panel safe-b w-full p-5 outline-none',
          'max-h-[86dvh] overflow-y-auto overscroll-contain',
          SIZE[size],
        )}
        style={{
          transform: `translateY(${drag.y}px)`,
          transition: drag.dragging ? 'none' : 'transform 0.3s var(--ease-glass)',
          touchAction: 'pan-y',
        }}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
      >
        {/* 移动端底部 sheet 的拖拽条：按住下滑可关闭（桌面端隐藏） */}
        <div
          className="mb-1 flex cursor-grab justify-center pt-1 sm:hidden"
          onPointerDown={onHandleDown}
          style={{ touchAction: 'none' }}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-[var(--line-3)]" />
        </div>

        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold">
              {icon}
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                {description}
              </p>
            )}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] hover:text-[var(--ink-1)]"
            >
              <IconClose size={18} />
            </button>
          )}
        </div>

        {children}

        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </GlassPanel>
    </div>,
    document.body,
  )
}
