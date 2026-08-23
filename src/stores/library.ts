import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { classifyByTitle } from '@/lib/romTitleClassifier'
import { deleteCustomRom } from '@/lib/storage'
import type { CustomGame, RecentEntry } from '@/types/game'

const MAX_RECENTS = 24

interface LibraryState {
  favorites: string[]
  recents: RecentEntry[]
  /** 用户上传的 ROM 元数据（ROM 本体存在 IndexedDB） */
  customGames: CustomGame[]
  /** 自动截图 / 手动上传得到的封面，gameId -> dataURL */
  coverOverrides: Record<string, string>

  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  recordPlay: (id: string, seconds: number) => void
  clearRecents: () => void
  addCustomGame: (g: CustomGame) => void
  removeCustomGame: (id: string) => void
  /** 批量添加（来自多选/目录扫描），按 id 与 sourceKey 去重，避免重复收录 */
  addCustomGames: (games: CustomGame[]) => void
  /** 删除某个来源目录下的全部游戏（连带 ROM 二进制、收藏、最近、封面） */
  removeDirGames: (dirId: string) => void
  setCover: (id: string, dataUrl: string) => void
  clearCover: (id: string) => void
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],
      customGames: [],
      coverOverrides: {},

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [id, ...s.favorites],
        })),

      isFavorite: (id) => get().favorites.includes(id),

      recordPlay: (id, seconds) =>
        set((s) => {
          const prev = s.recents.find((r) => r.gameId === id)
          const entry: RecentEntry = {
            gameId: id,
            playedAt: Date.now(),
            seconds: (prev?.seconds ?? 0) + Math.max(0, Math.round(seconds)),
          }
          return {
            recents: [entry, ...s.recents.filter((r) => r.gameId !== id)].slice(0, MAX_RECENTS),
          }
        }),

      clearRecents: () => set({ recents: [] }),

      addCustomGame: (g) =>
        set((s) => ({ customGames: [g, ...s.customGames.filter((x) => x.id !== g.id)] })),

      addCustomGames: (games) =>
        set((s) => {
          const existingIds = new Set(s.customGames.map((g) => g.id))
          const existingKeys = new Set(
            s.customGames.map((g) => g.sourceKey).filter((k): k is string => Boolean(k)),
          )
          const toAdd = games.filter(
            (g) => !existingIds.has(g.id) && !(g.sourceKey && existingKeys.has(g.sourceKey)),
          )
          if (!toAdd.length) return s
          return { customGames: [...toAdd, ...s.customGames] }
        }),

      removeCustomGame: (id) =>
        set((s) => {
          const covers = { ...s.coverOverrides }
          delete covers[id]
          return {
            customGames: s.customGames.filter((x) => x.id !== id),
            favorites: s.favorites.filter((x) => x !== id),
            recents: s.recents.filter((r) => r.gameId !== id),
            coverOverrides: covers,
          }
        }),

      removeDirGames: (dirId) =>
        set((s) => {
          const removedIds = new Set(
            s.customGames.filter((g) => g.sourceDirId === dirId).map((g) => g.id),
          )
          if (!removedIds.size) return s
          // ROM 二进制在 IndexedDB，异步清；store 先撤元数据，避免界面闪现已删条目
          removedIds.forEach((id) => void deleteCustomRom(id))
          const covers = { ...s.coverOverrides }
          removedIds.forEach((id) => delete covers[id])
          return {
            customGames: s.customGames.filter((g) => g.sourceDirId !== dirId),
            favorites: s.favorites.filter((x) => !removedIds.has(x)),
            recents: s.recents.filter((r) => !removedIds.has(r.gameId)),
            coverOverrides: covers,
          }
        }),

      setCover: (id, dataUrl) =>
        set((s) => ({ coverOverrides: { ...s.coverOverrides, [id]: dataUrl } })),

      clearCover: (id) =>
        set((s) => {
          const covers = { ...s.coverOverrides }
          delete covers[id]
          return { coverOverrides: covers }
        }),
    }),
    {
      name: 'nes-arcade:library',
      version: 2,
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as LibraryState
        if (version === 1) {
          // 第一版 customGames 可能缺 category 或被错误兜底成 action。
          // 用文件名重新启发式分类一次（无需读 ROM 字节），汉化 ROM 也能归到合理类别。
          return {
            ...state,
            customGames: state.customGames.map((g) => ({
              ...g,
              category: g.category && g.category !== 'action' ? g.category : classifyByTitle(g.title),
            })),
          }
        }
        return state
      },
    },
  ),
)
