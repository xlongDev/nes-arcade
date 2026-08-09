import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import type { Game, SaveSlot } from '@/types/game'
import { getGame } from '@/data/games'
import { useLibrary } from '@/stores/library'
import { usePrefs } from '@/stores/prefs'
import { listSaves, deleteSave } from '@/lib/storage'
import { toast } from '@/components/ui/Toast'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { IconBack, IconHeart, IconPause, IconPlay, IconReset, IconFullscreen, IconVolume, IconCamera, IconSave, IconLoad, IconClose, IconGrid } from '@/components/ui/Icons'
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

  const api = useEmulator({
    game,
    canvasRef,
    containerRef: screenRef,
    volume,
    muted,
    autoCover,
    onCover,
    onRecordSecond,
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

  const volumeLevel = muted ? 0 : volume > 0.5 ? 2 : 1
  const playing = api.status === 'running'

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
    await deleteSave(game.id, slot)
    void refreshSaves()
  }
  const handleCover = async () => {
    const url = await api.screenshot()
    if (url) {
      setCover(game.id, url)
      toast.success('已用当前画面更新封面')
    }
  }

  return (
    <div className="stack-page flex min-h-[100dvh] flex-col gap-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
      {/* 顶部控制栏 */}
      <header className="flex items-center gap-2">
        <Link to="/" search={HOME_SEARCH} aria-label="返回游戏库" className="shrink-0">
          <GlassButton variant="glass" size="icon">
            <IconBack size={18} />
          </GlassButton>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight">{game.title}</h1>
          <p className="truncate text-[11px] text-[var(--ink-3)]">
            {game.isCustom ? '本地上传' : `${game.hasBattery ? '电池存档 · ' : ''}Mapper ${game.mapper}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(game.id)}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          aria-pressed={isFavorite}
          className={cx(
            'grid size-11 shrink-0 place-items-center rounded-[var(--radius-glass-sm)]',
            'border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_6%,transparent)]',
            'transition-colors hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)]',
            isFavorite ? 'text-[var(--color-rose)]' : 'text-[var(--ink-2)]',
          )}
        >
          <IconHeart size={18} filled={isFavorite} />
        </button>
      </header>

      {/* 画面 */}
      <div className="relative flex flex-1 items-center justify-center">
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
                  <GlassButton variant="glass" onClick={() => navigate({ to: '/', search: HOME_SEARCH })}>
                    返回游戏库
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* HUD 工具条 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <GlassButton
          variant={playing ? 'glass' : 'primary'}
          onClick={api.togglePause}
          disabled={api.status === 'loading' || api.status === 'error'}
        >
          {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
          {playing ? '暂停' : '继续'}
        </GlassButton>
        <GlassButton variant="glass" size="icon" onClick={api.reset} title="重置游戏" aria-label="重置游戏">
          <IconReset size={18} />
        </GlassButton>
        <GlassButton variant="glass" size="icon" onClick={api.toggleFullscreen} title="全屏" aria-label="全屏">
          <IconFullscreen size={18} />
        </GlassButton>

        {/* 音量 */}
        <div className="glass-faux flex items-center gap-2 rounded-[var(--radius-glass-sm)] px-3 py-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? '取消静音' : '静音'}
            className="text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
          >
            <IconVolume size={18} level={volumeLevel} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="音量"
            className="h-1.5 w-24 cursor-pointer accent-[var(--color-brand)]"
          />
        </div>

        <GlassButton variant="glass" size="icon" onClick={handleCover} title="截图当封面" aria-label="截图当封面">
          <IconCamera size={18} />
        </GlassButton>
        <GlassButton
          variant={panel === 'slots' ? 'primary' : 'glass'}
          onClick={() => setPanel(panel === 'slots' ? 'none' : 'slots')}
          title="存档 / 读档"
          aria-label="存档 / 读档"
        >
          <IconSave size={16} />
          <span className="hidden sm:inline">存档</span>
        </GlassButton>

        {game.isCustom && (
          <GlassButton
            variant="glass"
            size="icon"
            title="移除该上传 ROM"
            aria-label="移除该上传 ROM"
            onClick={() => {
              removeCustomGame(game.id)
              toast.success('已移除本地 ROM')
              void navigate({ to: '/', search: HOME_SEARCH })
            }}
          >
            <IconClose size={18} />
          </GlassButton>
        )}
      </div>

      {/* 移动端虚拟手柄 */}
      {showVirtualPad && (
        <GlassPanel radius="lg" className="mx-auto w-full max-w-[520px]">
          <VirtualPad pressDown={api.pressDown} pressUp={api.pressUp} haptics={touchHaptics} />
        </GlassPanel>
      )}

      {/* 存档 / 读档面板 */}
      {panel === 'slots' && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => setPanel('none')}
        >
          <GlassPanel
            radius="xl"
            sheen
            className="w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <IconGrid size={17} /> 存档管理
              </h2>
              <button
                type="button"
                onClick={() => setPanel('none')}
                aria-label="关闭"
                className="grid size-9 place-items-center rounded-full text-[var(--ink-3)] hover:bg-[color-mix(in_srgb,var(--ink-1)_10%,transparent)]"
              >
                <IconClose size={18} />
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map((slot) => {
                const s = saves.find((x) => x.slot === slot)
                return (
                  <li
                    key={slot}
                    className="flex items-center gap-3 rounded-[var(--radius-glass-md)] border border-[var(--line-1)] bg-[color-mix(in_srgb,var(--ink-1)_5%,transparent)] p-2.5"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-[10px] bg-black">
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
                      <GlassButton size="sm" variant="glass" onClick={() => handleSave(slot)} disabled={api.status === 'error'}>
                        <IconSave size={14} /> 存
                      </GlassButton>
                      <GlassButton size="sm" variant="glass" onClick={() => handleLoad(slot)} disabled={!s}>
                        <IconLoad size={14} /> 读
                      </GlassButton>
                      {s && (
                        <GlassButton size="sm" variant="glass" onClick={() => handleDelete(slot)} aria-label={`删除第 ${slot} 存档`}>
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
          </GlassPanel>
        </div>
      )}
    </div>
  )
}
