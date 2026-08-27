import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KeyMap, NesButton } from '@/types/game'
import type { SortDir, SortKey } from '@/router'

export type ThemeMode = 'system' | 'light' | 'dark'
export type VideoFilter = 'none' | 'scanline' | 'crt'

/** 默认键位：方向键 + WASD + IJKL 双方向布局，Enter/Shift 当 Start/Select */
export const DEFAULT_KEYMAP: KeyMap = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyI: 'up',
  KeyK: 'down',
  KeyJ: 'left',
  KeyL: 'right',
  // A/B：字母区用 U/O，数字区用小键盘 1/3
  KeyU: 'a',
  KeyO: 'b',
  Numpad8: 'up',
  Numpad2: 'down',
  Numpad4: 'left',
  Numpad6: 'right',
  Numpad1: 'b',
  Numpad3: 'a',
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
  /** 虚拟手柄自定义按钮位置（百分比 {x,y}），未定义则使用默认布局 */
  touchPadLayout: Partial<Record<NesButton, { x: number; y: number }>>
  /** 游玩 10 秒自动截图作为封面 */
  autoCover: boolean
  /** 整数倍缩放，避免像素被拉糊 */
  integerScale: boolean
  reduceGlass: boolean
  firstRunDone: boolean
  /** 启动时自动扫描已添加的游戏目录，导入新增的 ROM */
  autoScanDirs: boolean
  /** 上次在游戏库用的排序(「名称 / 年代 / 体积 / 最近」)。URL 优先级更高,
   *  这里只用于「打开应用时」的初值,以及刷新前一份链接忘了带参时的兜底。 */
  librarySort: SortKey
  libraryDir: SortDir

  setThemeMode: (m: ThemeMode) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  setKey: (code: string, button: NesButton) => void
  removeKey: (code: string) => void
  resetKeymap: () => void
  setVideoFilter: (f: VideoFilter) => void
  setTouchPad: (t: 'auto' | 'on' | 'off') => void
  setTouchPadLayout: (button: NesButton, pos: { x: number; y: number } | null) => void
  resetTouchPadLayout: () => void
  setLibrarySort: (s: SortKey) => void
  setLibraryDir: (d: SortDir) => void
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
      touchPadLayout: {},
      autoCover: true,
      integerScale: false,
      reduceGlass: false,
      firstRunDone: false,
      autoScanDirs: true,
      librarySort: 'title',
      libraryDir: 'asc',

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
      setTouchPadLayout: (button, pos) =>
        set((s) => {
          const next = { ...s.touchPadLayout }
          if (pos) next[button] = pos
          else delete next[button]
          return { touchPadLayout: next }
        }),
      resetTouchPadLayout: () => set({ touchPadLayout: {} }),
      setLibrarySort: (librarySort) => set({ librarySort }),
      setLibraryDir: (libraryDir) => set({ libraryDir }),
      patch: (p) => set(p),
    }),
    {
      name: 'nes-arcade:prefs',
      version: 3,
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
        touchPadLayout: s.touchPadLayout,
        autoCover: s.autoCover,
        integerScale: s.integerScale,
        reduceGlass: s.reduceGlass,
        firstRunDone: s.firstRunDone,
        autoScanDirs: s.autoScanDirs,
        librarySort: s.librarySort,
        libraryDir: s.libraryDir,
      }),
      // v1→v2 补 librarySort / libraryDir; v2→v3 补 touchPadLayout
      migrate: (persistedState, version) => {
        let state = persistedState as PrefsState
        if (version < 2) {
          state = {
            ...state,
            librarySort: 'title' as SortKey,
            libraryDir: 'asc' as SortDir,
          }
        }
        if (version < 3) {
          state = { ...state, touchPadLayout: {} }
        }
        return state
      },
    },
  ),
)

/** 把 themeMode 解析成实际生效的明暗 */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
