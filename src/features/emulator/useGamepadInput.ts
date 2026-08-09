import { useEffect } from 'react'
import type { NesButton } from '@/types/game'

interface GamepadHooks {
  enabled: boolean
  /** 手柄标准按钮索引 → NES 按键 */
  gamepadMap: Record<number, NesButton>
  pressDown: (b: NesButton) => void
  pressUp: (b: NesButton) => void
}

const ALL_BUTTONS: NesButton[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select']

/**
 * Gamepad API 轮询。
 *
 * 标准手柄布局（Standard Gamepad mapping）：
 *   buttons 0/1/2/3 → A/B/X/Y，8/9 → Select/Start，12-15 → 方向
 *   左右摇杆 axes[0]/axes[1] 也映射成方向，方便用手柄玩。
 *
 * 用 rAF 轮询而非 gamepadconnected 事件，因为同一手柄重连后索引会漂移；
 * 每个 (手柄, 按键) 维护上一帧状态，只在「按下沿 / 松开沿」投递事件。
 */
export function useGamepadInput({ enabled, gamepadMap, pressDown, pressUp }: GamepadHooks) {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.getGamepads) return

    let raf = 0
    const prev = new Map<string, boolean>()

    const tick = () => {
      const pads = navigator.getGamepads()
      for (let idx = 0; idx < pads.length; idx++) {
        const pad = pads[idx]
        if (!pad) continue

        const on = new Set<NesButton>()
        pad.buttons.forEach((btn, i) => {
          const mapped = gamepadMap[i]
          if (mapped && btn.pressed) on.add(mapped)
        })
        // 左摇杆作为方向
        const ax = pad.axes[0] ?? 0
        const ay = pad.axes[1] ?? 0
        if (ax < -0.4) on.add('left')
        else if (ax > 0.4) on.add('right')
        if (ay < -0.4) on.add('up')
        else if (ay > 0.4) on.add('down')

        for (const btn of ALL_BUTTONS) {
          const key = `${idx}:${btn}`
          const isOn = on.has(btn)
          const wasOn = prev.get(key) ?? false
          if (isOn && !wasOn) pressDown(btn)
          else if (!isOn && wasOn) pressUp(btn)
          prev.set(key, isOn)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, gamepadMap, pressDown, pressUp])
}
