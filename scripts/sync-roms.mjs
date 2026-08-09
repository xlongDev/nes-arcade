/**
 * 把桌面 NES 目录下的 ROM 同步到 public/roms。
 * 处理两件事：
 *   1. 扁平化目录（原始结构有三个子目录，其中两个只有一个文件）
 *   2. 去重 —— 超级玛莉 在「84游戏合集」与「超级玛莉」目录下各有一份
 */
import { readdir, mkdir, copyFile, stat, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(__dirname, '../../roms')
const TARGET = join(__dirname, '../public/roms')

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (extname(entry.name).toLowerCase() === '.nes') out.push(full)
  }
  return out
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`✗ 找不到 ROM 源目录：${SOURCE}`)
    process.exit(1)
  }

  await mkdir(TARGET, { recursive: true })
  const files = await walk(SOURCE)

  // 用内容哈希去重：同一个游戏的不同副本内容完全一致
  const seen = new Map()
  const duplicates = []

  for (const file of files) {
    const buf = await readFile(file)
    const hash = createHash('sha1').update(buf).digest('hex')
    const name = basename(file)

    if (seen.has(hash)) {
      duplicates.push({ kept: seen.get(hash).name, dropped: name })
      continue
    }
    seen.set(hash, { file, name, size: buf.length })
  }

  let copied = 0
  for (const { file, name } of seen.values()) {
    // 统一小写扩展名（超级玛莉.NES → 超级玛莉.nes）
    const clean = basename(name, extname(name)) + '.nes'
    const dest = join(TARGET, clean)
    if (existsSync(dest) && (await stat(dest)).size === (await stat(file)).size) continue
    await copyFile(file, dest)
    copied++
  }

  const total = [...seen.values()].reduce((s, r) => s + r.size, 0)
  console.log(`✓ 同步完成：${seen.size} 个 ROM（新拷贝 ${copied} 个），共 ${(total / 1024 / 1024).toFixed(2)} MB`)
  if (duplicates.length) {
    console.log(`  去重 ${duplicates.length} 个：`)
    for (const d of duplicates) console.log(`    - ${d.dropped}（内容同 ${d.kept}）`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
