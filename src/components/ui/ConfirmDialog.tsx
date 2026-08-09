import { useSyncExternalStore } from 'react'
import { GlassDialog } from './GlassDialog'
import { GlassButton } from './GlassButton'
import { IconTrash } from './Icons'

/**
 * 二次确认框。
 *
 * 之前设置页直接用 window.confirm —— 功能上没错，但那是个系统级弹窗：
 * 玻璃质感、暗色主题、圆角语言全部断掉，而且移动端样式完全不可控。
 *
 * API 故意做成命令式的，和 toast() 一个路子，替换 window.confirm 时
 * 调用处基本只改一个 await：
 *
 *   if (!(await confirmDialog({ title: '清除所有存档？', tone: 'danger' }))) return
 *
 * 危险操作的默认焦点落在「取消」上（hideClose 之后取消是第一个可聚焦元素），
 * 这样一路回车不会把数据删掉。
 */

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  tone?: 'default' | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  id: number
  resolve: (ok: boolean) => void
}

let current: ConfirmState | null = null
const listeners = new Set<() => void>()
let seq = 0

function emit() {
  listeners.forEach((l) => l())
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // 同一时刻只留一个确认框。已存在的直接当作取消，避免弹窗叠罗汉。
  current?.resolve(false)
  return new Promise<boolean>((resolve) => {
    current = { ...options, id: ++seq, resolve }
    emit()
  })
}

function settle(ok: boolean) {
  current?.resolve(ok)
  current = null
  emit()
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const getSnapshot = () => current
const getServerSnapshot = () => null

export function ConfirmHost() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const danger = state?.tone === 'danger'

  return (
    <GlassDialog
      key={state?.id}
      open={state !== null}
      onClose={() => settle(false)}
      title={state?.title ?? ''}
      description={state?.description}
      icon={danger ? <IconTrash size={16} /> : undefined}
      size="sm"
      hideClose
      footer={
        <>
          <GlassButton variant="glass" onClick={() => settle(false)}>
            {state?.cancelText ?? '取消'}
          </GlassButton>
          <GlassButton variant={danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
            {state?.confirmText ?? '确定'}
          </GlassButton>
        </>
      }
    />
  )
}
