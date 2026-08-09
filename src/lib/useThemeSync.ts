import { useCallback, useEffect } from 'react'
import { usePrefs, resolveTheme } from '@/stores/prefs'

/**
 * 把偏好里的主题同步到 <html data-theme>，并在 system 模式下跟随系统切换。
 * 首帧的初值由 index.html 内联脚本负责，这里只处理后续变化。
 */
export function useThemeSync() {
  const themeMode = usePrefs((s) => s.themeMode)
  const reduceGlass = usePrefs((s) => s.reduceGlass)

  useEffect(() => {
    const apply = () => {
      const theme = resolveTheme(themeMode)
      document.documentElement.dataset.theme = theme
      document
        .querySelector('meta[name="theme-color"]:not([media])')
        ?.setAttribute('content', theme === 'dark' ? '#0b0f1a' : '#eef2ff')
    }
    apply()

    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.dataset.glass = reduceGlass ? 'off' : 'on'
  }, [reduceGlass])
}

/**
 * 主题切换的共享逻辑：返回当前是否暗色 + 一个带 View Transition 的 toggle。
 * 顶栏（TopBar）与游戏页（GameTopBar）共用，避免两边各写一遍。
 */
export function useThemeToggle() {
  const themeMode = usePrefs((s) => s.themeMode)
  const setThemeMode = usePrefs((s) => s.setThemeMode)
  const isDark = resolveTheme(themeMode) === 'dark'
  const toggle = useCallback(
    () => switchThemeWithTransition(() => setThemeMode(isDark ? 'light' : 'dark')),
    [isDark, setThemeMode],
  )
  return { isDark, toggle }
}

/**
 * 主题切换时给一次 View Transition —— 明暗过渡从"闪一下"变成"擦过去"。
 * 不支持的浏览器直接同步切换，不做 polyfill。
 */
export function switchThemeWithTransition(run: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> }
  }
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    run()
    return
  }
  doc.startViewTransition(run)
}
