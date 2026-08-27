import type { ErrorComponentProps } from '@tanstack/react-router'

/**
 * 全局路由错误兜底：任意页面渲染期抛错不再整页白屏，
 * 而是显示可恢复的玻璃面板 + 重试。WASM / ROM / 解析异常都走这里。
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div className="glass max-w-md rounded-2xl p-8">
        <h1 className="text-lg font-semibold text-white">出错了</h1>
        <p className="mt-2 break-words text-sm text-white/70">{message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/25"
        >
          重试
        </button>
      </div>
    </div>
  )
}
