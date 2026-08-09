import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import {
  IconBack,
  IconSun,
  IconGamepad,
  IconVolume,
  IconSparkle,
  IconReset,
  IconTrash,
  IconSave,
} from '@/components/ui/Icons'
import { usePrefs, type ThemeMode, type VideoFilter } from '@/stores/prefs'
import { useLibrary } from '@/stores/library'
import { clearSaves, clearCustomRoms, estimateUsage } from '@/lib/storage'
import { toast } from '@/components/ui/Toast'
import { formatBytes } from '@/lib/format'
import { switchThemeWithTransition } from '@/lib/useThemeSync'
import type { NesButton } from '@/types/game'

const THEME_OPTIONS = [
  { value: 'system' as ThemeMode, label: '跟随系统' },
  { value: 'light' as ThemeMode, label: '浅色' },
  { value: 'dark' as ThemeMode, label: '深色' },
]
const FILTER_OPTIONS = [
  { value: 'none' as VideoFilter, label: '无' },
  { value: 'scanline' as VideoFilter, label: '扫描线' },
  { value: 'crt' as VideoFilter, label: 'CRT' },
]
const PAD_OPTIONS = [
  { value: 'auto' as const, label: '自动' },
  { value: 'on' as const, label: '始终' },
  { value: 'off' as const, label: '关闭' },
]

const NES_BUTTONS: { button: NesButton; label: string }[] = [
  { button: 'up', label: '上' },
  { button: 'down', label: '下' },
  { button: 'left', label: '左' },
  { button: 'right', label: '右' },
  { button: 'a', label: 'A' },
  { button: 'b', label: 'B' },
  { button: 'start', label: 'Start' },
  { button: 'select', label: 'Select' },
]

const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ShiftLeft: 'L-Shift',
  ShiftRight: 'R-Shift',
  Enter: 'Enter',
  Space: 'Space',
}

function prettyKey(code: string): string {
  if (KEY_LABELS[code]) return KEY_LABELS[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        <span className="text-[var(--color-brand)]">{icon}</span>
        {title}
      </h2>
      <GlassPanel radius="lg" className="divide-y divide-[var(--line-1)] p-1">
        {children}
      </GlassPanel>
    </section>
  )
}

function KeyBindRow({
  button,
  codes,
  onCapture,
  onReset,
}: {
  button: NesButton
  codes: string[]
  onCapture: (code: string) => void
  onReset: () => void
}) {
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      onCapture(e.code)
      setCapturing(false)
    }
    window.addEventListener('keydown', onKey, { once: true })
    return () => window.removeEventListener('keydown', onKey)
  }, [capturing, onCapture])

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[14px] text-[var(--ink-1)]">{button.toUpperCase()}</span>
      <div className="flex items-center gap-2">
        {capturing ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--color-brand)_22%,transparent)] px-3 py-1.5 text-[12px] text-[var(--color-brand)]">
            按下任意键…
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setCapturing(true)}
            className="flex flex-wrap justify-end gap-1 rounded-full border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] px-3 py-1.5 text-[12px] text-[var(--ink-1)] transition-colors hover:border-[var(--line-3)]"
          >
            {codes.length ? (
              codes.map((c) => (
                <kbd
                  key={c}
                  className="rounded bg-[color-mix(in_srgb,var(--ink-1)_12%,transparent)] px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {prettyKey(c)}
                </kbd>
              ))
            ) : (
              <span className="text-[var(--ink-4)]">未绑定</span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          aria-label={`重置 ${button} 键位`}
          className="grid size-7 place-items-center rounded-full text-[var(--ink-4)] hover:text-[var(--ink-1)]"
        >
          <IconReset size={14} />
        </button>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const prefs = usePrefs()
  const customGames = useLibrary((s) => s.customGames)
  const removeCustomGame = useLibrary((s) => s.removeCustomGame)

  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  useEffect(() => {
    void estimateUsage().then(setUsage)
  }, [])

  // 当前每个 NES 键位绑定的键盘码（反向查找，可能有多个）
  const codesByButton = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const [code, btn] of Object.entries(prefs.keymap)) {
      ;(map[btn] ??= []).push(code)
    }
    return map
  }, [prefs.keymap])

  const setTheme = (v: ThemeMode) => switchThemeWithTransition(() => prefs.setThemeMode(v))

  const handleClearSaves = async () => {
    if (!window.confirm('确定清除所有游戏存档？此操作不可恢复。')) return
    await clearSaves()
    toast.success('已清除所有存档')
  }
  const handleClearRoms = async () => {
    if (!window.confirm('确定删除所有上传的本地 ROM？')) return
    await clearCustomRoms()
    customGames.forEach((g) => removeCustomGame(g.id))
    toast.success('已清除上传的 ROM')
  }
  const handleResetAll = () => {
    if (!window.confirm('确定恢复所有默认设置（键位、主题、偏好）？')) return
    prefs.resetKeymap()
    prefs.patch({ themeMode: 'system', videoFilter: 'none', touchPad: 'auto', touchHaptics: true, autoCover: true, integerScale: false, reduceGlass: false, volume: 0.7, muted: false })
    toast.success('已恢复默认设置')
  }

  return (
    <div className="stack-page max-w-2xl pb-24 pt-4">
      <header className="mb-7 flex items-center gap-3">
        <Link to="/" search={{ q: '', cat: 'all', sort: 'title', fav: false }} aria-label="返回" className="shrink-0">
          <GlassButton variant="glass" size="icon">
            <IconBack size={18} />
          </GlassButton>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
      </header>

      <Section title="外观" icon={<IconSun size={15} />}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[14px] text-[var(--ink-1)]">主题</span>
          <Segmented label="主题" size="sm" value={prefs.themeMode} options={THEME_OPTIONS} onChange={setTheme} />
        </div>
        <Toggle
          label="弱化玻璃效果"
          description="关闭模糊与极光背景，低端机更流畅"
          checked={prefs.reduceGlass}
          onChange={(v) => prefs.patch({ reduceGlass: v })}
        />
      </Section>

      <Section title="画面与声音" icon={<IconVolume size={15} />}>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[14px] text-[var(--ink-1)]">音量</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => prefs.toggleMute()}
              aria-label={prefs.muted ? '取消静音' : '静音'}
              className="text-[var(--ink-2)]"
            >
              <IconVolume size={18} level={prefs.muted ? 0 : prefs.volume > 0.5 ? 2 : 1} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={prefs.volume}
              onChange={(e) => prefs.setVolume(Number(e.target.value))}
              aria-label="音量"
              className="h-1.5 w-32 cursor-pointer accent-[var(--color-brand)]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[14px] text-[var(--ink-1)]">画面滤镜</span>
          <Segmented
            label="画面滤镜"
            size="sm"
            value={prefs.videoFilter}
            options={FILTER_OPTIONS}
            onChange={(v) => prefs.setVideoFilter(v)}
          />
        </div>
        <Toggle
          label="整数倍缩放"
          description="像素严格按整数倍放大，画面更锐利不糊"
          checked={prefs.integerScale}
          onChange={(v) => prefs.patch({ integerScale: v })}
        />
      </Section>

      <Section title="键位与手柄" icon={<IconGamepad size={15} />}>
        <div className="px-4 py-3">
          <p className="mb-3 text-[12px] text-[var(--ink-3)]">
            点击右侧按键后按下你想绑定的键。同一功能可绑定多个键（如方向键 + WASD）。
          </p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {NES_BUTTONS.map(({ button }) => (
              <KeyBindRow
                key={button}
                button={button}
                codes={codesByButton[button] ?? []}
                onCapture={(code) => prefs.setKey(code, button)}
                onReset={() => {
                  // 清掉该键位所有现有绑定，再恢复默认里属于它的键
                  const next = { ...prefs.keymap }
                  for (const [c, b] of Object.entries(next)) if (b === button) delete next[c]
                  prefs.patch({ keymap: next })
                }}
              />
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12px] leading-snug text-[var(--ink-4)]">
            手柄遵循标准布局：A/B 对应 NES 的 B/A，十字键与左摇杆均为方向，8/9 为 Select/Start。插上手柄即可用，无需设置。
          </p>
        </div>
      </Section>

      <Section title="移动端" icon={<IconSparkle size={15} />}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[14px] text-[var(--ink-1)]">虚拟手柄</span>
          <Segmented
            label="虚拟手柄"
            size="sm"
            value={prefs.touchPad}
            options={PAD_OPTIONS}
            onChange={(v) => prefs.setTouchPad(v)}
          />
        </div>
        <Toggle
          label="按键震动反馈"
          description="在支持的触屏设备上，按下虚拟键时轻微震动"
          checked={prefs.touchHaptics}
          onChange={(v) => prefs.patch({ touchHaptics: v })}
        />
        <Toggle
          label="自动截图当封面"
          description="每局游玩 10 秒后，用当前画面替换游戏封面"
          checked={prefs.autoCover}
          onChange={(v) => prefs.patch({ autoCover: v })}
        />
      </Section>

      <Section title="本地数据" icon={<IconSave size={15} />}>
        <div className="px-4 py-3">
          <p className="text-[14px] text-[var(--ink-1)]">
            已占用空间
            <span className="ml-2 tnum text-[var(--ink-3)]">
              {usage ? `${formatBytes(usage.usage)} / ${formatBytes(usage.quota)}` : '计算中…'}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3">
          <GlassButton variant="glass" onClick={handleClearSaves} className="justify-start">
            <IconTrash size={16} /> 清除所有存档
          </GlassButton>
          <GlassButton variant="glass" onClick={handleClearRoms} className="justify-start">
            <IconTrash size={16} /> 删除上传的 ROM
          </GlassButton>
          <GlassButton variant="glass" onClick={handleResetAll} className="justify-start">
            <IconReset size={16} /> 恢复默认设置
          </GlassButton>
        </div>
      </Section>

      <p className="px-1 text-center text-[11px] leading-relaxed text-[var(--ink-4)]">
        所有游戏数据均存储在本机浏览器中。本合集仅供个人休闲娱乐，ROM 版权归原所有者所有。
      </p>
    </div>
  )
}
