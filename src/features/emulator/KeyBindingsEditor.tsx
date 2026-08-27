import { useEffect, useMemo, useState } from 'react'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { IconGamepad, IconReset } from '@/components/ui/Icons'
import { usePrefs } from '@/stores/prefs'
import type { NesButton } from '@/types/game'
import { cx } from '@/lib/cx'

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
  Numpad1: 'Numpad1',
  Numpad2: 'Numpad2',
  Numpad3: 'Numpad3',
  Numpad4: 'Numpad4',
  Numpad6: 'Numpad6',
  Numpad8: 'Numpad8',
}

function prettyKey(code: string): string {
  if (KEY_LABELS[code]) return KEY_LABELS[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return code
  return code
}

function KeyBindRow({
  label,
  codes,
  onCapture,
  onReset,
}: {
  label: string
  codes: string[]
  onCapture: (code: string) => void
  onReset: () => void
}) {
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        // Esc 退出捕获模式，不拦截 GlassDialog 的关闭
        setCapturing(false)
        return
      }
      e.preventDefault()
      onCapture(e.code)
      // 保持捕获状态，允许连续绑定多个键
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [capturing, onCapture])

  return (
    <div
      className={cx(
        'grid items-center gap-2 rounded-[var(--radius-glass-md)] px-3 py-2 transition-colors',
        'grid-cols-[2.75rem_1fr_1.75rem]',
        capturing && 'bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]',
        !capturing && 'hover:bg-[color-mix(in_srgb,var(--ink-1)_5%,transparent)]',
      )}
    >
      <span className="text-[13px] font-medium text-[var(--ink-1)]">{label}</span>

      <div className="min-w-0">
        {capturing ? (
          <button
            type="button"
            onClick={() => setCapturing(false)}
            className="inline-flex animate-pulse items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] px-2.5 py-1 text-[12px] text-[var(--color-brand)]"
          >
            按下要绑定的键…
            <span className="ml-1.5 rounded-sm bg-[color-mix(in_srgb,var(--color-brand)_22%,transparent)] px-1 py-0.5 text-[10px]">Esc 完成</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCapturing(true)}
            className={cx(
              'flex min-h-[1.75rem] w-full flex-wrap items-center gap-1 rounded-full border px-2 py-1 text-[12px] transition-colors',
              codes.length
                ? 'border-[var(--line-2)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)] text-[var(--ink-1)] hover:border-[var(--line-3)]'
                : 'border-dashed border-[var(--line-2)] text-[var(--ink-4)] hover:border-[var(--line-3)] hover:text-[var(--ink-2)]',
            )}
          >
            {codes.length ? (
              codes.map((c) => (
                <kbd
                  key={c}
                  className="shrink-0 rounded bg-[color-mix(in_srgb,var(--ink-1)_12%,transparent)] px-1.5 py-0.5 font-mono text-[11px] leading-none"
                >
                  {prettyKey(c)}
                </kbd>
              ))
            ) : (
              <span className="px-1">点击绑定</span>
            )}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setCapturing(false)
          onReset()
        }}
        aria-label={`重置 ${label} 键位`}
        className="grid size-7 place-items-center rounded-full text-[var(--ink-4)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)] hover:text-[var(--ink-1)]"
      >
        <IconReset size={14} />
      </button>
    </div>
  )
}

export function KeyBindingsEditor({ showHint = true, compact = false }: { showHint?: boolean; compact?: boolean }) {
  const prefs = usePrefs()

  const codesByButton = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const [code, btn] of Object.entries(prefs.keymap)) {
      ;(map[btn] ??= []).push(code)
    }
    return map
  }, [prefs.keymap])

  const content = (
    <GlassPanel radius="lg" className="divide-y divide-[var(--line-1)] p-1">
      <div className="px-3 py-3">
          {showHint && (
            <p className="mb-3 text-[12px] text-[var(--ink-3)]">
              点击中间区域进入绑定模式，可连续按下多个键，按 Esc 结束。同一功能可绑定多个键（如方向键 + WASD）。
            </p>
          )}
        <div className={cx('grid gap-1', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          {NES_BUTTONS.map(({ button, label }) => (
            <KeyBindRow
              key={button}
              label={label}
              codes={codesByButton[button] ?? []}
              onCapture={(code) => {
                // 同一个物理键不能对应两个 NES 键：若已绑定到其他功能，先解绑
                const next = { ...prefs.keymap }
                if (next[code] && next[code] !== button) delete next[code]
                next[code] = button
                prefs.patch({ keymap: next })
              }}
              onReset={() => {
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
    </GlassPanel>
  )

  if (compact) return content

  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        <span className="text-[var(--color-brand)]">
          <IconGamepad size={15} />
        </span>
        键位与手柄
      </h2>
      {content}
    </section>
  )
}
