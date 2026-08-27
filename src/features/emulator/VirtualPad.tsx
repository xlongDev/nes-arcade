import { useCallback, useEffect, useRef, useState } from 'react'
import type { NesButton } from '@/types/game'
import { cx } from '@/lib/cx'
import { usePrefs } from '@/stores/prefs'

interface VirtualPadProps {
  pressDown: (b: NesButton) => void
  pressUp: (b: NesButton) => void
  haptics: boolean
  editable?: boolean
}

const DPAD_BUTTONS: NesButton[] = ['up', 'left', 'right', 'down']
const ACTION_BUTTONS: NesButton[] = ['a', 'b']
const META_BUTTONS: NesButton[] = ['select', 'start']

const LABELS: Record<NesButton, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
  a: 'A',
  b: 'B',
  select: 'SELECT',
  start: 'START',
}

/** 默认虚拟手柄布局（百分比坐标，基于容器中心） */
const DEFAULT_POSITIONS: Record<NesButton, { x: number; y: number }> = {
  up: { x: 18, y: 34 },
  left: { x: 7, y: 50 },
  right: { x: 29, y: 50 },
  down: { x: 18, y: 66 },
  b: { x: 68, y: 46 },
  a: { x: 88, y: 34 },
  select: { x: 66, y: 78 },
  start: { x: 86, y: 78 },
}

function isDpad(btn: NesButton) {
  return DPAD_BUTTONS.includes(btn)
}
function isAction(btn: NesButton) {
  return ACTION_BUTTONS.includes(btn)
}
function isMeta(btn: NesButton) {
  return META_BUTTONS.includes(btn)
}

export function VirtualPad({ pressDown, pressUp, haptics, editable }: VirtualPadProps) {
  const layout = usePrefs((s) => s.touchPadLayout)
  const setLayout = usePrefs((s) => s.setTouchPadLayout)
  const resetLayout = usePrefs((s) => s.resetTouchPadLayout)

  const containerRef = useRef<HTMLDivElement>(null)
  const active = useRef<NesButton | null>(null)
  const drag = useRef<{
    button: NesButton
    startX: number
    startY: number
    originX: number
    originY: number
    currentX: number
    currentY: number
  } | null>(null)

  const [preview, setPreview] = useState<Partial<Record<NesButton, { x: number; y: number }>>>({})

  const getPos = useCallback(
    (btn: NesButton) => preview[btn] ?? layout[btn] ?? DEFAULT_POSITIONS[btn],
    [layout, preview],
  )

  const bind = useCallback(
    (btn: NesButton) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (editable) return
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        active.current = btn
        pressDown(btn)
        if (haptics && navigator.vibrate) navigator.vibrate(8)
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (editable) return
        e.preventDefault()
        if (active.current === btn) {
          pressUp(btn)
          active.current = null
        }
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (editable) return
        if (active.current === btn) {
          pressUp(btn)
          active.current = null
        }
        e.preventDefault()
      },
      onPointerCancel: () => {
        if (editable) return
        if (active.current === btn) {
          pressUp(btn)
          active.current = null
        }
      },
    }),
    [pressDown, pressUp, haptics, editable],
  )

  const handleDragStart = useCallback(
    (btn: NesButton, e: React.PointerEvent) => {
      if (!editable || !containerRef.current) return
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const rect = containerRef.current.getBoundingClientRect()
      const pos = getPos(btn)
      drag.current = {
        button: btn,
        startX: e.clientX,
        startY: e.clientY,
        originX: (pos.x / 100) * rect.width,
        originY: (pos.y / 100) * rect.height,
        currentX: (pos.x / 100) * rect.width,
        currentY: (pos.y / 100) * rect.height,
      }
    },
    [editable, getPos],
  )

  const handleDragMove = useCallback(
    (btn: NesButton, e: React.PointerEvent) => {
      if (!editable || !drag.current || drag.current.button !== btn || !containerRef.current) return
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const nextX = drag.current.originX + (e.clientX - drag.current.startX)
      const nextY = drag.current.originY + (e.clientY - drag.current.startY)
      drag.current.currentX = nextX
      drag.current.currentY = nextY
      setPreview((p) => ({
        ...p,
        [btn]: {
          x: Math.max(0, Math.min(100, (nextX / rect.width) * 100)),
          y: Math.max(0, Math.min(100, (nextY / rect.height) * 100)),
        },
      }))
    },
    [editable],
  )

  const handleDragEnd = useCallback(
    (btn: NesButton, e: React.PointerEvent) => {
      if (!editable || !drag.current || drag.current.button !== btn || !containerRef.current) return
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, (drag.current.currentX / rect.width) * 100))
      const y = Math.max(0, Math.min(100, (drag.current.currentY / rect.height) * 100))
      setLayout(btn, { x, y })
      setPreview((p) => {
        const next = { ...p }
        delete next[btn]
        return next
      })
      drag.current = null
    },
    [editable, setLayout],
  )

  useEffect(() => {
    if (!editable) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [editable])

  return (
    <div className="pointer-events-auto flex flex-col gap-2 p-3 sm:p-4">
      {editable && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] text-[var(--ink-3)]">拖动按钮调整位置</span>
          <button
            type="button"
            onClick={resetLayout}
            className="text-[12px] font-medium text-[var(--color-brand)] transition-opacity hover:opacity-80"
          >
            恢复默认
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={cx(
          'relative w-full touch-none select-none',
          'h-[clamp(168px,44vw,230px)]',
          editable && 'rounded-[var(--radius-glass-lg)] bg-[color-mix(in_srgb,var(--ink-1)_4%,transparent)]',
        )}
        aria-label="虚拟手柄"
      >
        {editable && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[var(--line-1)]" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[var(--line-1)]" />
          </>
        )}

        {/* D-pad cross hub — visual only, sits under the four directional buttons */}
        <div
          className={cx(
            'pointer-events-none absolute left-[18%] top-1/2 -translate-x-1/2 -translate-y-1/2',
            'size-[clamp(34px,9.5vw,46px)]',
            'rounded-full bg-[color-mix(in_srgb,var(--ink-1)_8%,transparent)]',
            'shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]',
          )}
        />

        {([...DPAD_BUTTONS, ...ACTION_BUTTONS, ...META_BUTTONS] as NesButton[]).map((button) => {
          const pos = getPos(button)
          const label = LABELS[button]

          return (
            <button
              key={button}
              type="button"
              aria-label={button}
              {...bind(button)}
              onPointerDown={(e) => {
                bind(button).onPointerDown(e)
                handleDragStart(button, e)
              }}
              onPointerMove={(e) => handleDragMove(button, e)}
              onPointerUp={(e) => {
                bind(button).onPointerUp(e)
                handleDragEnd(button, e)
              }}
              onPointerLeave={(e) => {
                bind(button).onPointerLeave(e)
                if (editable && drag.current?.button === button) {
                  handleDragEnd(button, e)
                }
              }}
              onPointerCancel={() => {
                bind(button).onPointerCancel()
                if (editable && drag.current?.button === button) {
                  setPreview((p) => {
                    const next = { ...p }
                    delete next[button]
                    return next
                  })
                  drag.current = null
                }
              }}
              className={cx(
                'absolute grid select-none place-items-center font-medium',
                'touch-none transition-transform duration-75 active:scale-95',
                isDpad(button) && dpadClass(button),
                isAction(button) && actionClass(button),
                isMeta(button) && metaClass,
                editable && 'z-10 cursor-grab ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-transparent active:cursor-grabbing',
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function dpadClass(btn: NesButton): string {
  const base =
    'size-[clamp(46px,13vw,62px)] text-[18px] text-[var(--ink-1)] ' +
    'border border-[color-mix(in_srgb,var(--ink-1)_22%,transparent)] ' +
    'shadow-[0_5px_0_color-mix(in_srgb,var(--ink-1)_10%,transparent),0_8px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] ' +
    'active:shadow-[0_2px_0_color-mix(in_srgb,var(--ink-1)_10%,transparent),0_4px_8px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(0,0,0,0.2)] ' +
    'active:translate-y-[2px]'

  const fill =
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ink-1)_18%,transparent),color-mix(in_srgb,var(--ink-1)_8%,transparent))]'

  // Trim the square corners where the buttons meet at the center
  const radius = {
    up: 'rounded-t-[18px] rounded-b-sm',
    down: 'rounded-b-[18px] rounded-t-sm',
    left: 'rounded-l-[18px] rounded-r-sm',
    right: 'rounded-r-[18px] rounded-l-sm',
  } as const
  return cx(base, fill, radius[btn as keyof typeof radius])
}

function actionClass(btn: NesButton): string {
  const red = {
    base: 'shadow-[0_5px_0_#b01e1e,0_10px_22px_rgba(0,0,0,0.38),inset_0_2px_4px_rgba(255,255,255,0.28)]',
    active: 'active:shadow-[0_2px_0_#b01e1e,0_5px_12px_rgba(0,0,0,0.3),inset_0_3px_6px_rgba(0,0,0,0.22)]',
  }
  const blue = {
    base: 'shadow-[0_5px_0_#1a4ab0,0_10px_22px_rgba(0,0,0,0.38),inset_0_2px_4px_rgba(255,255,255,0.28)]',
    active: 'active:shadow-[0_2px_0_#1a4ab0,0_5px_12px_rgba(0,0,0,0.3),inset_0_3px_6px_rgba(0,0,0,0.22)]',
  }

  const theme = btn === 'a' ? red : blue

  return cx(
    'size-[clamp(56px,16vw,76px)] rounded-full text-[17px] font-bold text-white',
    btn === 'a'
      ? 'bg-[linear-gradient(160deg,#ff6b6b_0%,#ff4040_50%,#d63030_100%)]'
      : 'bg-[linear-gradient(160deg,#6b9fff_0%,#4280ff_50%,#255ed6_100%)]',
    'border border-white/25',
    theme.base,
    theme.active,
    'active:translate-y-[3px]',
  )
}

const metaClass = cx(
  'h-[clamp(32px,8.5vw,40px)] min-w-[clamp(72px,19vw,96px)] px-4 rounded-full text-[10px] font-semibold tracking-wide text-[var(--ink-2)]',
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ink-1)_14%,transparent),color-mix(in_srgb,var(--ink-1)_7%,transparent))]',
  'border border-[color-mix(in_srgb,var(--ink-1)_20%,transparent)]',
  'shadow-[0_4px_0_color-mix(in_srgb,var(--ink-1)_9%,transparent),0_6px_14px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.16)]',
  'active:shadow-[0_1px_0_color-mix(in_srgb,var(--ink-1)_9%,transparent),0_3px_8px_rgba(0,0,0,0.25),inset_0_2px_3px_rgba(0,0,0,0.15)]',
  'active:translate-y-[2px]',
)
