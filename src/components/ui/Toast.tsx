import { useSyncExternalStore, useEffect, useRef } from 'react'
import { cx } from '@/lib/cx'

/**
 * 极简 toast。
 * 用模块级 store + useSyncExternalStore，任何地方（包括非组件的 hook 内部）
 * 都能直接 toast('已保存')，不用套 Provider。
 */

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
  action?: ToastAction
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
let seq = 0

function emit() {
  items = [...items]
  listeners.forEach((l) => l())
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function toast(message: string, tone: ToastItem['tone'] = 'info', duration = 2400) {
  const id = ++seq
  items.push({ id, message, tone })
  emit()
  setTimeout(() => dismiss(id), duration)
  return id
}

toast.success = (m: string, d?: number) => toast(m, 'success', d)
toast.error = (m: string, d?: number) => toast(m, 'error', d ?? 3600)

/**
 * 带操作的 toast，目前只用于「撤销」。
 * 停留时间给到 6 秒 —— 撤销要留够反应时间，2.4 秒根本来不及读完再点。
 */
toast.withAction = (message: string, action: ToastAction, duration = 6000) => {
  const id = ++seq
  items.push({
    id,
    message,
    tone: 'info',
    action: {
      label: action.label,
      onClick: () => {
        action.onClick()
        dismiss(id)
      },
    },
  })
  emit()
  setTimeout(() => dismiss(id), duration)
  return id
}

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

function ToastRow({ t }: { t: ToastItem }) {
  return (
    <div
      className={cx(
        'glass glass-refract float-in pointer-events-auto',
        'flex items-center gap-3 rounded-[var(--radius-glass-md)] px-5 py-3',
        'text-[13.5px] font-medium tracking-tight',
        'max-w-[min(92vw,420px)]',
        TONE[t.tone],
      )}
    >
      <span className="min-w-0">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={t.action.onClick}
          className={cx(
            'shrink-0 rounded-full px-3 py-1 text-[12.5px] font-semibold',
            'text-[var(--color-brand-soft)] transition-colors',
            'hover:bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]',
          )}
        >
          {t.action.label}
        </button>
      )}
    </div>
  )
}

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const ref = useRef<HTMLDivElement>(null)

  // 视口尺寸变化时 toast 容器不需要重算，但要确保它不挡住虚拟手柄
  useEffect(() => {
    const el = ref.current
    if (el) el.style.pointerEvents = list.length ? 'auto' : 'none'
  }, [list.length])

  // 错误必须打断读屏当前朗读，成功/提示则排队播报。
  // 两个 live region 都常驻，因为 aria-live 只对"已在 DOM 里的容器"生效。
  const polite = list.filter((t) => t.tone !== 'error')
  const assertive = list.filter((t) => t.tone === 'error')

  return (
    <div
      ref={ref}
      className="safe-b pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2 px-4"
    >
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        {polite.map((t) => (
          <ToastRow key={t.id} t={t} />
        ))}
      </div>
      <div role="alert" aria-live="assertive" className="flex flex-col items-center gap-2">
        {assertive.map((t) => (
          <ToastRow key={t.id} t={t} />
        ))}
      </div>
    </div>
  )
}
