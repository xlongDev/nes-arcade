import { useEffect } from 'react'
import type { KeyMap, NesButton } from '@/types/game'

interface InputHooks {
  /** 当前是否允许键盘输入（如正在暂停、弹层打开时应置 false） */
  enabled: boolean
  /** 键盘码 → NES 按键 的映射 */
  keymap: KeyMap
  pressDown: (b: NesButton) => void
  pressUp: (b: NesButton) => void
}

/**
 * 键盘输入：把 KeyboardEvent.code 经 keymap 翻译成 NES 按键，
 * 用 pressDown / pressUp 投递给模拟器。
 *
 * - 命中映射的按键才 preventDefault，避免方向键 / 空格滚动页面
 * - e.repeat 时只投一次 down，松开才 up，防止系统按键重复制造抖动
 */
export function useKeyboardInput({ enabled, keymap, pressDown, pressUp }: InputHooks) {
  useEffect(() => {
    if (!enabled) return

    const down = (e: KeyboardEvent) => {
      const btn = keymap[e.code]
      if (!btn) return
      e.preventDefault()
      if (e.repeat) return
      pressDown(btn)
    }
    const up = (e: KeyboardEvent) => {
      const btn = keymap[e.code]
      if (!btn) return
      e.preventDefault()
      pressUp(btn)
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [enabled, keymap, pressDown, pressUp])
}
