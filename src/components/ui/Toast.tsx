import { useSyncExternalStore, useEffect, useRef } from 'react'
import { cx } from '@/lib/cx'

/**
 * 极简 toast。
 * 用模块级 store + useSyncExternalStore，任何地方（包括非组件的 hook 内部）
 * 都能直接 toast('已保存')，不用套 Provider。
 */

export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
  icon?: string
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
let seq = 0

function emit() {
  items = [...items]
  listeners.forEach((l) => l())
}

export function toast(message: string, tone: ToastItem['tone'] = 'info', duration = 2400) {
  const id = ++seq
  items.push({ id, message, tone })
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, duration)
  return id
}

toast.success = (m: string, d?: number) => toast(m, 'success', d)
toast.error = (m: string, d?: number) => toast(m, 'error', d ?? 3600)

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const getSnapshot = () => items
const EMPTY: ToastItem[] = []

const TONE: Record<ToastItem['tone'], string> = {
  info: 'text-[var(--ink-1)]',
  success: 'text-[var(--color-mint)]',
  error: 'text-[var(--color-rose)]',
}

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const ref = useRef<HTMLDivElement>(null)

  // 视口尺寸变化时 toast 容器不需要重算，但要确保它不挡住虚拟手柄
  useEffect(() => {
    const el = ref.current
    if (el) el.style.pointerEvents = list.length ? 'auto' : 'none'
  }, [list.length])

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="safe-b pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className={cx(
            'glass glass-refract float-in pointer-events-auto',
            'rounded-[var(--radius-glass-md)] px-5 py-3',
            'text-[13.5px] font-medium tracking-tight',
            'max-w-[min(92vw,420px)]',
            TONE[t.tone],
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
