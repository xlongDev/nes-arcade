import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KeyMap, NesButton } from '@/types/game'

export type ThemeMode = 'system' | 'light' | 'dark'
export type VideoFilter = 'none' | 'scanline' | 'crt'

/** 默认键位：贴合原版手柄的手感，方向键 + ZX，Enter/Shift 当 Start/Select */
export const DEFAULT_KEYMAP: KeyMap = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyJ: 'b',
  KeyK: 'a',
  KeyZ: 'b',
  KeyX: 'a',
  Enter: 'start',
  ShiftRight: 'select',
  ShiftLeft: 'select',
}

/** 手柄标准布局索引 → NES 按键 */
export const DEFAULT_GAMEPAD_MAP: Record<number, NesButton> = {
  0: 'b', // A（下）→ NES B，符合大多数人的肌肉记忆
  1: 'a', // B（右）→ NES A
  2: 'b',
  3: 'a',
  8: 'select',
  9: 'start',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
}

interface PrefsState {
  themeMode: ThemeMode
  volume: number
  muted: boolean
  keymap: KeyMap
  gamepadMap: Record<number, NesButton>
  videoFilter: VideoFilter
  /** 移动端虚拟手柄：auto = 触摸设备自动显示 */
  touchPad: 'auto' | 'on' | 'off'
  touchHaptics: boolean
  /** 游玩 10 秒自动截图作为封面 */
  autoCover: boolean
  /** 整数倍缩放，避免像素被拉糊 */
  integerScale: boolean
  reduceGlass: boolean
  firstRunDone: boolean

  setThemeMode: (m: ThemeMode) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setKey: (code: string, button: NesButton) => void
  removeKey: (code: string) => void
  resetKeymap: () => void
  setVideoFilter: (f: VideoFilter) => void
  setTouchPad: (t: 'auto' | 'on' | 'off') => void
  patch: (p: Partial<PrefsState>) => void
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      volume: 0.7,
      muted: false,
      keymap: DEFAULT_KEYMAP,
      gamepadMap: DEFAULT_GAMEPAD_MAP,
      videoFilter: 'none',
      touchPad: 'auto',
      touchHaptics: true,
      autoCover: true,
      integerScale: false,
      reduceGlass: false,
      firstRunDone: false,

      setThemeMode: (themeMode) => set({ themeMode }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), muted: false }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setKey: (code, button) => set((s) => ({ keymap: { ...s.keymap, [code]: button } })),
      removeKey: (code) =>
        set((s) => {
          const next = { ...s.keymap }
          delete next[code]
          return { keymap: next }
        }),
      resetKeymap: () => set({ keymap: DEFAULT_KEYMAP }),
      setVideoFilter: (videoFilter) => set({ videoFilter }),
      setTouchPad: (touchPad) => set({ touchPad }),
      patch: (p) => set(p),
    }),
    {
      name: 'nes-arcade:prefs',
      version: 1,
      // 与 index.html 的防闪烁脚本读取同一份结构，别改 key 名
      partialize: (s) => ({
        themeMode: s.themeMode,
        volume: s.volume,
        muted: s.muted,
        keymap: s.keymap,
        gamepadMap: s.gamepadMap,
        videoFilter: s.videoFilter,
        touchPad: s.touchPad,
        touchHaptics: s.touchHaptics,
        autoCover: s.autoCover,
        integerScale: s.integerScale,
        reduceGlass: s.reduceGlass,
        firstRunDone: s.firstRunDone,
      }),
    },
  ),
)

/** 把 themeMode 解析成实际生效的明暗 */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
