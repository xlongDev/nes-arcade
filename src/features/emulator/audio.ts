/**
 * 浏览器端音量控制。
 *
 * Nostalgist 0.21 的实例没有 setVolume / mute 方法，而 RetroArch 的运行时网络命令里
 * 也没有"设置音量"这一条 —— 只有 MUTE 切换。要做出丝滑的音量滑块，只能从更底层下手。
 *
 * 思路：在 Nostalgist 启动前把 window.AudioContext 换成一个子类。
 * RetroArch 的 WebAudio 实现是 `bufferSource.connect(RWA.context.destination)`，
 * 我们把 destination 改写成一个 GainNode，所有声音先经过它再连到真实输出，
 * 于是改 GainNode.gain 就能实时调音量 / 静音，且对模拟器完全透明。
 *
 * 这个子类只在 Nostalgist 建 AudioContext 那一刻生效一次，卸载后还原 window.AudioContext，
 * 不影响页面上其它声音（本应用也没有别的）。
 */

let masterGain: GainNode | null = null
let restore: (() => void) | null = null

interface VolWindow extends Window {
  __nesVolInstalled?: boolean
}

export function installVolumeHook(getLevel: () => number, getMuted: () => boolean): void {
  const w = window as unknown as VolWindow & {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  if (w.__nesVolInstalled || !w.AudioContext) return

  const RealAC = w.AudioContext
  if (!RealAC) return

  class VolAC extends RealAC {
    private __m: GainNode
    constructor(...args: any[]) {
      super(...args)
      // 直接调用基类 getter 拿到真实 AudioDestinationNode，比
      // Object.getOwnPropertyDescriptor(AudioContext.prototype, 'destination')
      // 更可靠：destination 实际定义在 BaseAudioContext.prototype 上。
      const realDest = super.destination
      const gain = this.createGain()
      gain.gain.value = getMuted() ? 0 : getLevel()
      masterGain = gain
      gain.connect(realDest)
      this.__m = gain
    }
    override get destination(): AudioDestinationNode {
      return this.__m as unknown as AudioDestinationNode
    }
  }

  w.AudioContext = VolAC as unknown as typeof AudioContext
  if (w.webkitAudioContext) w.webkitAudioContext = VolAC as unknown as typeof AudioContext
  w.__nesVolInstalled = true

  restore = () => {
    const ww = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown }
    ww.AudioContext = RealAC
    if (w.webkitAudioContext) ww.webkitAudioContext = RealAC
    w.__nesVolInstalled = false
    masterGain = null
    restore = null
  }
}

/** 实时设置主音量。hook 必须在模拟器启动前安装。 */
export function setMasterVolume(level: number, muted: boolean): void {
  if (masterGain) masterGain.gain.value = muted ? 0 : level
}

/** 卸载 AudioContext 补丁，还原原生实现。 */
export function uninstallVolumeHook(): void {
  restore?.()
}
