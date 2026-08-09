import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import type { Game, SaveSlot } from '@/types/game'
import { getGame } from '@/data/games'
import { useLibrary } from '@/stores/library'
import { usePrefs } from '@/stores/prefs'
import { listSaves, deleteSave } from '@/lib/storage'
import { toast } from '@/components/ui/Toast'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassDialog } from '@/components/ui/GlassDialog'
import { StatusBadge } from '@/components/emulator/StatusBadge'
import { GameTopBar, GameToolbar, ShortcutHints } from '@/components/emulator/GameHUD'
import { IconBack, IconClose, IconGrid, IconLoad, IconSave } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'
import { formatRelative } from '@/lib/format'
import { useEmulator } from '@/features/emulator/useEmulator'
import { useKeyboardInput } from '@/features/emulator/useKeyboardInput'
import { useGamepadInput } from '@/features/emulator/useGamepadInput'
import { VirtualPad } from '@/features/emulator/VirtualPad'
import { VideoFilterOverlay } from '@/features/emulator/VideoFilterOverlay'

const SLOT_COUNT = 5

const HOME_SEARCH = { q: '', cat: 'all' as const, sort: 'title' as const, fav: false } as const

export function PlayPage() {
  const { gameId } = useParams({ from: '/play/$gameId' })
  const navigate = useNavigate()

  const customGames = useLibrary((s) => s.customGames)
  const recordPlay = useLibrary((s) => s.recordPlay)
  const setCover = useLibrary((s) => s.setCover)
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)
  const removeCustomGame = useLibrary((s) => s.removeCustomGame)
  const isFavorite = useLibrary((s) => (gameId ? s.favorites.includes(gameId) : false))

  const volume = usePrefs((s) => s.volume)
  const muted = usePrefs((s) => s.muted)
  const setVolume = usePrefs((s) => s.setVolume)
  const toggleMute = usePrefs((s) => s.toggleMute)
  const autoCover = usePrefs((s) => s.autoCover)
  const videoFilter = usePrefs((s) => s.videoFilter)
  const integerScale = usePrefs((s) => s.integerScale)
  const touchPad = usePrefs((s) => s.touchPad)
  const touchHaptics = usePrefs((s) => s.touchHaptics)
  const keymap = usePrefs((s) => s.keymap)
  const gamepadMap = usePrefs((s) => s.gamepadMap)

  const game = useMemo<Game | null>(() => {
    const base = getGame(gameId)
    if (base) return base
    const custom = customGames.find((c) => c.id === gameId)
    if (custom) {
      return {
        id: custom.id,
        title: custom.title,
        file: '',
        fileName: custom.title,
        bytes: custom.bytes,
        cover: null,
        mapper: custom.mapper,
        prgKb: 0,
        chrKb: 0,
        hasBattery: false,
        hasTrainer: false,
        mirroring: 'horizontal',
        format: 'iNES',
        category: 'action',
        players: 1,
        desc: '本地上传的 ROM',
        alias: [],
        featured: false,
        pinyin: '',
        initials: '',
        haystack: custom.title.toLowerCase(),
        isCustom: true,
      }
    }
    return null
  }, [gameId, customGames])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)

  const onRecordSecond = useCallback(
    (s: number) => game && recordPlay(game.id, s),
    [game, recordPlay],
  )
  const onCover = useCallback(
    (url: string) => game && setCover(game.id, url),
    [game, setCover],
  )

  /** 重试计数：+1 即重新启动模拟器（见 useEmulator 的 runId） */
  const [runId, setRunId] = useState(0)
  /** 本次游玩累计秒数，仅运行时增长，切游戏 / 重试时归零 */
  const [elapsed, setElapsed] = useState(0)

  const api = useEmulator({
    game,
    canvasRef,
    containerRef: screenRef,
    volume,
    muted,
    autoCover,
    onCover,
    onRecordSecond,
    runId,
  })

  const [panel, setPanel] = useState<'none' | 'slots'>('none')
  const [saves, setSaves] = useState<SaveSlot[]>([])

  const refreshSaves = useCallback(async () => {
    if (!game) return
    setSaves(await listSaves(game.id))
  }, [game])

  useEffect(() => {
    if (panel === 'slots') void refreshSaves()
  }, [panel, refreshSaves])

  // 输入：键盘 / 手柄 / 虚拟手柄
  const inputEnabled = !panel && api.status !== 'error' && api.status !== 'idle'
  useKeyboardInput({ enabled: inputEnabled, keymap, pressDown: api.pressDown, pressUp: api.pressUp })
  useGamepadInput({ enabled: inputEnabled, gamepadMap, pressDown: api.pressDown, pressUp: api.pressUp })
  const showVirtualPad =
    game != null &&
    (touchPad === 'on' || (touchPad === 'auto' && typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches))

  // 全局快捷键：空格暂停 / F 全屏 / Esc 关闭面板
  // 用户若把某键绑到了 NES 按键（如把 Space 绑成 start），则以游戏输入为准，这里让路。
  const canUseSpace = api.status === 'running' || api.status === 'paused'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      // 面板开着时游戏快捷键全部让路；Esc 由 GlassDialog 在 capture 阶段接管
      if (panel) return
      if (e.code === 'Space' && canUseSpace && !(e.code in keymap)) {
        e.preventDefault()
        api.togglePause()
      } else if (e.code === 'KeyF') {
        e.preventDefault()
        api.toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, canUseSpace, keymap, api.togglePause, api.toggleFullscreen])

  // 整数倍缩放
  useEffect(() => {
    const wrap = screenRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const apply = () => {
      if (integerScale) {
        const r = wrap.getBoundingClientRect()
        const scale = Math.max(1, Math.floor(Math.min(r.width / 256, r.height / 240)))
        canvas.style.width = `${256 * scale}px`
        canvas.style.height = `${240 * scale}px`
      } else {
        canvas.style.width = '100%'
        canvas.style.height = '100%'
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [integerScale, game?.id])

  if (!game) {
    return (
      <div className="stack-page grid min-h-[70vh] place-items-center">
        <div className="glass-faux flex flex-col items-center gap-4 rounded-[var(--radius-glass-lg)] px-8 py-14 text-center">
          <span className="text-[var(--ink-3)]">找不到这款游戏，它可能已被移除。</span>
          <Link to="/" search={HOME_SEARCH}>
            <GlassButton variant="primary">
              <IconBack size={16} />
              返回游戏库
            </GlassButton>
          </Link>
        </div>
      </div>
    )
  }

  const playing = api.status === 'running'

  // 已玩时长：切换游戏 / 重试时归零；仅在运行时每秒 +1，暂停时冻结
  useEffect(() => {
    setElapsed(0)
  }, [game?.id, runId])
  useEffect(() => {
    if (api.status !== 'running') return
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [api.status])

  const handleSave = async (slot: number) => {
    try {
      await api.saveSlot(slot)
      toast.success(`已存入第 ${slot} 个存档位`)
      void refreshSaves()
    } catch {
      toast.error('存档失败')
    }
  }
  const handleLoad = async (slot: number) => {
    const ok = await api.loadSlot(slot)
    if (ok) {
      toast.success(`已读取第 ${slot} 个存档位`)
      setPanel('none')
    } else {
      toast.error('该存档位为空')
    }
  }
  const handleDelete = async (slot: number) => {
    // 存档删了就真没了（IndexedDB 里没有回收站），必须拦一道
    const ok = await confirmDialog({
      title: `删除第 ${slot} 个存档位？`,
      description: '存档只保存在这台设备上，删除后无法恢复。',
      confirmText: '删除',
      tone: 'danger',
    })
    if (!ok) return
    await deleteSave(game.id, slot)
    void refreshSaves()
    toast.success(`已删除第 ${slot} 个存档位`)
  }
  const handleCover = async () => {
    const url = await api.screenshot()
    if (url) {
      setCover(game.id, url)
      toast.success('已用当前画面更新封面')
    }
  }
  const handleRemove = async () => {
    const ok = await confirmDialog({
      title: `从本地移除《${game.title}》？`,
      description: '这份 ROM 只存在这台设备上，移除后需要重新上传才能再玩。',
      confirmText: '移除',
      tone: 'danger',
    })
    if (!ok) return
    removeCustomGame(game.id)
    toast.success('已移除本地 ROM')
    void navigate({ to: '/', search: HOME_SEARCH })
  }

  return (
    <div className="stack-page flex min-h-[100dvh] flex-col gap-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-4">
      <GameTopBar game={game} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />

      {/* 画面 + 状态条 */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3">
        <StatusBadge status={api.status} elapsed={elapsed} />

        <GlassPanel
          radius="xl"
          sheen
          className={cx(
            'relative grid place-items-center overflow-hidden p-3 sm:p-4',
            'w-full max-w-[min(96vw,920px)]',
          )}
        >
          <div
            ref={screenRef}
            className="nes-screen relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[var(--radius-glass-md)] bg-black"
          >
            <VideoFilterOverlay filter={videoFilter} />

            {api.status === 'loading' && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 text-[var(--ink-2)]">
                <div className="flex flex-col items-center gap-3">
                  <span className="size-7 animate-[spin-slow_0.8s_linear_infinite] rounded-full border-2 border-white/30 border-t-white" />
                  <span className="text-[13px]">正在载入内核与 ROM…</span>
                </div>
              </div>
            )}
          {api.status === 'error' && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[14px] font-medium text-[var(--color-rose)]">启动失败</span>
                <span className="max-w-xs text-[12px] text-[var(--ink-3)]">{api.error}</span>
                <div className="mt-1 flex items-center gap-2">
                  <GlassButton variant="primary" onClick={() => setRunId((r) => r + 1)}>
                    重试
                  </GlassButton>
                  <GlassButton variant="glass" onClick={() => navigate({ to: '/', search: HOME_SEARCH })}>
                    返回游戏库
                  </GlassButton>
                </div>
                <span className="max-w-xs text-[11px] leading-relaxed text-[var(--ink-4)]">
                  若多次失败，可能是该 ROM 不被 fceumm 内核支持。可换一份 ROM，或在仓库提 Issue 反馈。
                </span>
              </div>
            </div>
          )}

        </div>
        </GlassPanel>
      </div>

      <GameToolbar
        api={api}
        playing={playing}
        volume={volume}
        muted={muted}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onCover={() => void handleCover()}
        panelOpen={panel === 'slots'}
        onTogglePanel={() => setPanel(panel === 'slots' ? 'none' : 'slots')}
        onRemove={game.isCustom ? handleRemove : undefined}
      />

      <ShortcutHints />

      {/* 移动端虚拟手柄 */}
      {showVirtualPad && (
        <GlassPanel radius="lg" className="mx-auto w-full max-w-[520px]">
          <VirtualPad pressDown={api.pressDown} pressUp={api.pressUp} haptics={touchHaptics} />
        </GlassPanel>
      )}

      {/* 存档 / 读档面板 */}
      <GlassDialog
        open={panel === 'slots'}
        onClose={() => setPanel('none')}
        title="存档管理"
        icon={<IconGrid size={17} />}
        footer={
          <p className="text-[11px] leading-snug text-[var(--ink-4)]">
            {game.isCustom ? '本地上传 ROM' : `Mapper ${game.mapper} · ${game.hasBattery ? '电池存档' : '无电池'} · fceumm 内核`}
          </p>
        }
      >
        <ul className="flex flex-col gap-2">
          {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map((slot) => {
            const s = saves.find((x) => x.slot === slot)
            return (
              <li
                key={slot}
                className={cx(
                  'flex items-center gap-3 rounded-[var(--radius-glass-md)] border p-2.5',
                  'transition-colors',
                  // 有存档的槽位给一点存在感，空槽位退到背景里
                  s
                    ? 'border-[var(--line-2)] bg-[color-mix(in_srgb,var(--ink-1)_7%,transparent)]'
                    : 'border-dashed border-[var(--line-1)] bg-transparent',
                )}
              >
                <div className="size-20 shrink-0 overflow-hidden rounded-[10px] bg-black">
                  {s?.thumbnail ? (
                    <img src={s.thumbnail} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-[10px] text-[var(--ink-4)]">
                      空
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">第 {slot} 个存档位</p>
                  <p className="truncate text-[11px] text-[var(--ink-3)]">
                    {s ? `${formatRelative(s.createdAt)} · ${Math.round(s.bytes / 1024)} KB` : '未使用'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <GlassButton
                    size="sm"
                    variant="glass"
                    onClick={() => handleSave(slot)}
                    disabled={api.status === 'error'}
                    aria-label={s ? `覆盖第 ${slot} 个存档位` : `存入第 ${slot} 个存档位`}
                  >
                    <IconSave size={14} /> 存
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="glass"
                    onClick={() => handleLoad(slot)}
                    disabled={!s}
                    aria-label={`读取第 ${slot} 个存档位`}
                  >
                    <IconLoad size={14} /> 读
                  </GlassButton>
                  {s && (
                    <GlassButton
                      size="sm"
                      variant="glass"
                      onClick={() => void handleDelete(slot)}
                      aria-label={`删除第 ${slot} 个存档位`}
                      className="hover:text-[var(--color-rose)]"
                    >
                      <IconClose size={14} />
                    </GlassButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-[11px] leading-snug text-[var(--ink-4)]">
          存档保存在浏览器本地（IndexedDB），换设备不会同步。带电池存档的游戏会自动保存进度。
        </p>
      </GlassDialog>
    </div>
  )
}
