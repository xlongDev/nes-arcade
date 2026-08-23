import { useEffect, useState } from 'react'

/**
 * 命令面板（⌘K / Ctrl+K）的开合状态。
 * 只负责「监听全局快捷键 + 维护 open 状态」，面板自身的渲染与交互在 CommandPalette 里。
 * 用 toggle 而非只开：在面板输入框里再按 ⌘K 能随手关掉，符合主流命令面板的手感。
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { open, setOpen }
}
