/**
 * 扫描 public/roms 下的 ROM，解析 iNES 文件头，产出 games.generated.json。
 * 这个文件是机器生成的，不要手工编辑 —— 人工元数据请写在 src/data/games.meta.ts。
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROMS = join(__dirname, '../public/roms')
const COVERS = join(__dirname, '../public/covers')
const OUT = join(__dirname, '../src/data/games.generated.json')

/** 解析 iNES / NES 2.0 文件头 */
function parseINes(buf) {
  if (buf.length < 16) return null
  if (!(buf[0] === 0x4e && buf[1] === 0x45 && buf[2] === 0x53 && buf[3] === 0x1a)) return null

  const prgBanks = buf[4]
  const chrBanks = buf[5]
  const flags6 = buf[6]
  const flags7 = buf[7]

  const isNes2 = (flags7 & 0x0c) === 0x08
  let mapper = (flags7 & 0xf0) | (flags6 >> 4)
  if (isNes2) mapper |= (buf[8] & 0x0f) << 8

  return {
    mapper,
    prgKb: prgBanks * 16,
    chrKb: chrBanks * 8,
    hasBattery: (flags6 & 0x02) !== 0,
    hasTrainer: (flags6 & 0x04) !== 0,
    mirroring: flags6 & 0x01 ? 'vertical' : 'horizontal',
    format: isNes2 ? 'NES2.0' : 'iNES',
  }
}

function stableId(name) {
  return createHash('sha1').update(name).digest('hex').slice(0, 10)
}

async function main() {
  if (!existsSync(ROMS)) {
    console.error(`✗ 找不到 ${ROMS}，请先运行 npm run sync`)
    process.exit(1)
  }

  const covers = new Set()
  if (existsSync(COVERS)) {
    for (const f of await readdir(COVERS)) {
      if (/\.(jpg|jpeg|png|webp)$/i.test(f)) covers.add(basename(f, extname(f)))
    }
  }

  const files = (await readdir(ROMS)).filter((f) => extname(f).toLowerCase() === '.nes').sort()
  const entries = []
  const failed = []

  for (const f of files) {
    const buf = await readFile(join(ROMS, f))
    const header = parseINes(buf)
    const title = basename(f, extname(f))

    if (!header) {
      failed.push(f)
      continue
    }

    entries.push({
      id: stableId(title),
      title,
      file: `roms/${encodeURIComponent(f)}`,
      fileName: f,
      bytes: buf.length,
      cover: covers.has(title) ? `covers/${encodeURIComponent(title)}.jpg` : null,
      ...header,
    })
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(entries, null, 2) + '\n', 'utf8')

  const mapperCount = entries.reduce((m, e) => ((m[e.mapper] = (m[e.mapper] ?? 0) + 1), m), {})
  const withCover = entries.filter((e) => e.cover).length
  const totalMb = entries.reduce((s, e) => s + e.bytes, 0) / 1024 / 1024

  console.log(`✓ 扫描完成：${entries.length} 个 ROM，共 ${totalMb.toFixed(2)} MB`)
  console.log(`  封面命中：${withCover} / ${entries.length}`)
  console.log(`  mapper 分布：${Object.entries(mapperCount).sort((a, b) => b[1] - a[1]).map(([m, c]) => `${m}(${c})`).join(' ')}`)
  if (failed.length) console.log(`  ✗ 无效 iNES 头：${failed.join(', ')}`)
  console.log(`  → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
