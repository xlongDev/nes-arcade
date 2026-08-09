/**
 * IndexedDB 持久层。
 *
 * 为什么不用 localStorage：存档是几十 KB 到几百 KB 的二进制，
 * 自定义 ROM 更是上兆。localStorage 只能存字符串且有 5MB 硬上限，
 * base64 还要再膨胀 33%。IndexedDB 可以直接存 Uint8Array / Blob。
 */
import { get, set, del, keys, createStore } from 'idb-keyval'
import type { SaveSlot } from '@/types/game'

// 注意：idb-keyval 的 createStore 用 `indexedDB.open(dbName)` 且在 onupgradeneeded
// 里只建一个 object store。若多个 createStore 共用同一个 dbName，只有第一个能建出自己的
// store，其余的 store 根本不会被创建，调用时 `db.transaction('xxx')` 直接抛 NotFoundError。
// 所以每个 store 必须用独立的 dbName（这个坑曾导致「上传所有 ROM 都报 读取文件失败」）。
const saveStore = createStore('nes-arcade-saves', 'saves')
const romStore = createStore('nes-arcade-roms', 'roms')
const metaStore = createStore('nes-arcade-meta', 'meta')

const SLOT_KEY = (gameId: string, slot: number) => `${gameId}::${slot}`
const SLOT_META_KEY = (gameId: string, slot: number) => `slotmeta::${gameId}::${slot}`

/* ---------------- 存档 ---------------- */

export async function writeSave(
  gameId: string,
  slot: number,
  data: Uint8Array,
  thumbnail?: string,
): Promise<SaveSlot> {
  const meta: SaveSlot = {
    gameId,
    slot,
    createdAt: Date.now(),
    bytes: data.byteLength,
    ...(thumbnail ? { thumbnail } : {}),
  }
  // 拷贝一份再存：Emscripten 的堆内存视图会被复用，直接存会读到脏数据
  await set(SLOT_KEY(gameId, slot), new Uint8Array(data), saveStore)
  await set(SLOT_META_KEY(gameId, slot), meta, metaStore)
  return meta
}

export async function readSave(gameId: string, slot: number): Promise<Uint8Array | undefined> {
  return get<Uint8Array>(SLOT_KEY(gameId, slot), saveStore)
}

export async function deleteSave(gameId: string, slot: number): Promise<void> {
  await del(SLOT_KEY(gameId, slot), saveStore)
  await del(SLOT_META_KEY(gameId, slot), metaStore)
}

export async function listSaves(gameId: string): Promise<SaveSlot[]> {
  const all = await keys(metaStore)
  const prefix = `slotmeta::${gameId}::`
  const mine = all.filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
  const metas = await Promise.all(mine.map((k) => get<SaveSlot>(k, metaStore)))
  return metas.filter((m): m is SaveSlot => Boolean(m)).sort((a, b) => a.slot - b.slot)
}

/* ---------------- 自定义 ROM ---------------- */

/**
 * 生成自定义 ROM 的唯一 id。
 *
 * `crypto.randomUUID()` 只在安全上下文（https / localhost）下可用；
 * 在局域网 IP（如 http://192.168.x.x:5173）或 file:// 下它是 undefined，
 * 直接调用会抛 TypeError —— 这正是「上传所有游戏都报 读取文件失败」的根因。
 * 这里做降级：退而用 getRandomValues 拼一个 UUID v4，再不济用时间戳兜底，
 * 保证任意环境都能拿到合法 id。
 */
export function genCustomRomId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return `custom-${c.randomUUID()}`
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16))
    b[6] = (b[6]! & 0x0f) | 0x40 // version 4
    b[8] = (b[8]! & 0x3f) | 0x80 // variant 10xx
    const h = [...b].map((x) => x.toString(16).padStart(2, '0'))
    const uuid = `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
    return `custom-${uuid}`
  }
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function writeCustomRom(id: string, data: Uint8Array): Promise<void> {
  await set(id, new Uint8Array(data), romStore)
}

export async function readCustomRom(id: string): Promise<Uint8Array | undefined> {
  return get<Uint8Array>(id, romStore)
}

export async function deleteCustomRom(id: string): Promise<void> {
  await del(id, romStore)
}

/* ---------------- 电池存档（SRAM） ---------------- */

const SRAM_KEY = (gameId: string) => `sram::${gameId}`

export async function writeSram(gameId: string, data: Uint8Array): Promise<void> {
  await set(SRAM_KEY(gameId), new Uint8Array(data), saveStore)
}

export async function readSram(gameId: string): Promise<Uint8Array | undefined> {
  return get<Uint8Array>(SRAM_KEY(gameId), saveStore)
}

/* ---------------- 批量清理 ---------------- */

/** 清空所有存档（含电池 SRAM）。Meta 一并清掉。 */
export async function clearSaves(): Promise<void> {
  const ks = await keys(saveStore)
  await Promise.all(ks.map((k) => del(k, saveStore)))
}

/** 清空所有上传的自定义 ROM 本体（IndexedDB 内的二进制）。 */
export async function clearCustomRoms(): Promise<void> {
  const ks = await keys(romStore)
  await Promise.all(ks.map((k) => del(k, romStore)))
}

/* ---------------- 工具 ---------------- */

/** 估算已占用的存储空间，设置页展示用 */
export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}
