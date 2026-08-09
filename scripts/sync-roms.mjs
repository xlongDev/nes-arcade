/**
 * 把源目录下的 ROM 同步到 public/roms。
 *
 * 源目录优先级：
 *   1. 环境变量 ROMS_SRC（绝对路径或相对当前工作目录）
 *   2. 仓库同级的 ../roms
 *
 * 处理两件事：
 *   1. 扁平化目录（源目录可能有任意层级的子目录）
 *   2. 内容去重 —— 同一个游戏常在「合集」和「单卡」目录下各存一份
 *
 * 注意：源目录不存在时**不视为错误**，只提示并跳过，
 * 这样 clone 本仓库、打算用「网页上传」方式的用户跑 prepare:data 不会被中断。
 */
import { readdir, mkdir, copyFile, stat, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE = process.env.ROMS_SRC
  ? resolve(process.cwd(), process.env.ROMS_SRC)
  : join(__dirname, '../../roms')
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
  await mkdir(TARGET, { recursive: true })

  if (!existsSync(SOURCE)) {
    console.log(`ℹ 未找到 ROM 源目录：${SOURCE}`)
    console.log('  跳过同步。若要批量导入 ROM，请任选一种方式：')
    console.log(`    · 把 .nes 文件放进 ${SOURCE}，再重跑 npm run prepare:data`)
    console.log('    · 或指定其它目录：ROMS_SRC=/你的/路径 npm run prepare:data')
    console.log('    · 或直接 npm run dev，在应用「上传页」拖入 .nes 文件')
    return
  }

  const files = await walk(SOURCE)

  if (files.length === 0) {
    console.log(`ℹ 源目录 ${SOURCE} 下没有 .nes 文件，跳过同步。`)
    return
  }

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
