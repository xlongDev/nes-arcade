import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Nostalgist } from 'nostalgist'
import type { Game, NesButton } from '@/types/game'
import { readCustomRom, readSram, readSave, writeSave, writeSram } from '@/lib/storage'
import { installVolumeHook, setMasterVolume, uninstallVolumeHook } from './audio'

export type EmuStatus = 'idle' | 'loading' | 'running' | 'paused' | 'error'

export interface EmulatorApi {
  status: EmuStatus
  error: string | null
  pause: () => void
  resume: () => void
  togglePause: () => void
  reset: () => void
  toggleFullscreen: () => void
  screenshot: () => Promise<string | null>
  saveSlot: (slot: number) => Promise<void>
  loadSlot: (slot: number) => Promise<boolean>
  setVolume: (level: number, muted: boolean) => void
  pressDown: (b: NesButton) => void
  pressUp: (b: NesButton) => void
}

interface UseEmulatorArgs {
  game: Game | null
  canvasRef: RefObject<HTMLCanvasElement | null>
  containerRef?: RefObject<HTMLElement | null>
  volume: number
  muted: boolean
  autoCover: boolean
  onCover: (dataUrl: string) => void
  onRecordSecond: (seconds: number) => void
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

/** 把 Uint8Array 安全地包成 Blob（TS 5.7+ 中 Uint8Array 的 buffer 可能是 SharedArrayBuffer）。 */
function toBlob(bytes: Uint8Array): Blob {
  const ab = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(ab).set(bytes)
  return new Blob([ab])
}

/**
 * 把 Nostalgist 模拟器封装成 React 友好的控制器。
 *
 * 关键点：
 *  - 内核走本地 public/cores，resolveCoreJs/Wasm 指向本站，零运行时 CDN 依赖
 *  - 自定义 ROM 从 IndexedDB 读 Uint8Array 直接喂给 Nostalgist
 *  - 电池存档游戏：启动前读 SRAM 注入，运行期每 20s + 退出时落盘
 *  - 游玩 10s 自动截图当封面（autoCover 开启时）
 *  - 每秒记录一次游玩时长，驱动"最近游玩"
 *
 * effect 依赖只用 game.id，prefs 变化通过 ref 透传，避免反复重启模拟器。
 */
export function useEmulator({
  game,
  canvasRef,
  containerRef,
  volume,
  muted,
  autoCover,
  onCover,
  onRecordSecond,
}: UseEmulatorArgs) {
  const [status, setStatusState] = useState<EmuStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const instanceRef = useRef<Nostalgist | null>(null)
  const statusRef = useRef<EmuStatus>('idle')
  const volumeRef = useRef(volume)
  const mutedRef = useRef(muted)
  const autoCoverRef = useRef(autoCover)
  const onCoverRef = useRef(onCover)
  const onTickRef = useRef(onRecordSecond)
  const coveredRef = useRef(false)

  const setStatus = useCallback((s: EmuStatus) => {
    statusRef.current = s
    setStatusState(s)
  }, [])

  // prefs 实时透传（不重启模拟器）
  useEffect(() => {
    volumeRef.current = volume
    mutedRef.current = muted
    setMasterVolume(volume, muted)
  }, [volume, muted])
  useEffect(() => {
    autoCoverRef.current = autoCover
  }, [autoCover])
  useEffect(() => {
    onCoverRef.current = onCover
  }, [onCover])
  useEffect(() => {
    onTickRef.current = onRecordSecond
  }, [onRecordSecond])

  const pressDown = useCallback((b: NesButton) => instanceRef.current?.pressDown(b), [])
  const pressUp = useCallback((b: NesButton) => instanceRef.current?.pressUp(b), [])

  const saveSram = useCallback(async () => {
    const n = instanceRef.current
    if (!n || !game?.hasBattery) return
    try {
      const blob = await n.saveSRAM()
      await writeSram(game.id, new Uint8Array(await blob.arrayBuffer()))
    } catch {
      /* SRAM 保存失败不阻断游玩 */
    }
  }, [game])

  const screenshot = useCallback(async (): Promise<string | null> => {
    const n = instanceRef.current
    if (!n) return null
    try {
      return await blobToDataURL(await n.screenshot())
    } catch {
      return null
    }
  }, [])

  const saveSlot = useCallback(
    async (slot: number) => {
      const n = instanceRef.current
      if (!n || !game) return
      const { state, thumbnail } = await n.saveState()
      const bytes = new Uint8Array(await state.arrayBuffer())
      const thumb = thumbnail ? await blobToDataURL(thumbnail) : undefined
      await writeSave(game.id, slot, bytes, thumb)
      await saveSram()
    },
    [game, saveSram],
  )

  const loadSlot = useCallback(
    async (slot: number): Promise<boolean> => {
      const n = instanceRef.current
      if (!n || !game) return false
      const bytes = await readSave(game.id, slot)
      if (!bytes) return false
      await n.loadState(toBlob(bytes))
      return true
    },
    [game],
  )

  const toggleFullscreen = useCallback(() => {
    const el = containerRef?.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }, [containerRef])

  const reset = useCallback(() => instanceRef.current?.restart(), [])
  const pause = useCallback(() => {
    instanceRef.current?.pause()
    setStatus('paused')
  }, [setStatus])
  const resume = useCallback(() => {
    instanceRef.current?.resume()
    setStatus('running')
  }, [setStatus])
  const togglePause = useCallback(() => {
    if (statusRef.current === 'running') pause()
    else if (statusRef.current === 'paused') resume()
  }, [pause, resume])

  const setVolumeApi = useCallback((level: number, m: boolean) => {
    volumeRef.current = level
    mutedRef.current = m
    setMasterVolume(level, m)
  }, [])

  // 主启动流程（依赖只用 game?.id，保证只启动一次）
  useEffect(() => {
    if (!game) return
    let cancelled = false
    const timers: number[] = []

    ;(async () => {
      try {
        setStatus('loading')
        setError(null)
        coveredRef.current = false
        installVolumeHook(
          () => volumeRef.current,
          () => mutedRef.current,
        )

        let romInput: unknown
        if (game.isCustom) {
          const bytes = await readCustomRom(game.id)
          if (!bytes) throw new Error('找不到该 ROM，可能已被清理')
          romInput = { fileName: game.fileName, fileContent: bytes }
        } else {
          romInput = new URL(`./${game.file}`, document.baseURI).href
        }

        const sram = game.hasBattery ? await readSram(game.id) : undefined

        // 不传 element：Nostalgist 会自己创建 canvas。若把 React 管理的 canvas 直接传给它，
        // exit({removeCanvas:true}) 会把它从 DOM 移除，下次启动就可能被 append 到 body 造成错位。
        // 我们自己在启动后把 getCanvas() 移入 containerRef，确保位置可控。
        const nostalgist = (await Nostalgist.nes({
          core: 'fceumm',
          rom: romInput,
          // 音量由 AudioContext GainNode 统一控制，不要传 audio_volume：
          // RetroArch 把 audio_volume 解释为 dB，传 100 会导致严重削波/爆音。
          // 本地内核：指向本站 public/cores，去除运行时 CDN 依赖
          resolveCoreJs: (core: string) =>
            new URL(`./cores/${core}_libretro.js`, location.href).href,
          resolveCoreWasm: (core: string) =>
            new URL(`./cores/${core}_libretro.wasm`, location.href).href,
          ...(sram ? { sram: toBlob(sram) } : {}),
          sramType: 'srm',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)) as Nostalgist

        if (cancelled) {
          // 取消时彻底清理临时 canvas
          nostalgist.exit({ removeCanvas: true })
          return
        }

        const canvas = nostalgist.getCanvas()
        if (canvasRef) canvasRef.current = canvas
        if (containerRef?.current && canvas.parentElement !== containerRef.current) {
          containerRef.current.appendChild(canvas)
        }

        instanceRef.current = nostalgist
        setStatus('running')

        timers.push(
          window.setInterval(() => {
            if (statusRef.current === 'running') onTickRef.current(1)
          }, 1000),
        )
        timers.push(
          window.setInterval(() => {
            if (statusRef.current === 'running') void saveSram()
          }, 20000),
        )
        // 游玩 10 秒自动截图当封面
        timers.push(
          window.setTimeout(async () => {
            if (cancelled || coveredRef.current || !autoCoverRef.current) return
            if (statusRef.current !== 'running') return
            const url = await screenshot()
            if (url) {
              coveredRef.current = true
              onCoverRef.current(url)
            }
          }, 10000),
        )
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(err instanceof Error ? err.message : '模拟器启动失败')
        }
      }
    })()

    return () => {
      cancelled = true
      timers.forEach((t) => {
        clearInterval(t)
        clearTimeout(t)
      })
      // removeCanvas:false 防止 Nostalgist 把 canvas 从 DOM 移除，避免下次启动时画面被 append 到 body。
      instanceRef.current?.exit({ removeCanvas: false })
      instanceRef.current = null
      uninstallVolumeHook()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id])

  const api: EmulatorApi = {
    status,
    error,
    pause,
    resume,
    togglePause,
    reset,
    toggleFullscreen,
    screenshot,
    saveSlot,
    loadSlot,
    setVolume: setVolumeApi,
    pressDown,
    pressUp,
  }

  return api
}
