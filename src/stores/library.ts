import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
      version: 1,
    },
  ),
)
