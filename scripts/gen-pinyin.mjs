/**
 * 为游戏标题生成拼音索引（全拼 + 首字母），产出 src/data/pinyin.generated.json。
 * 拼音库只在构建期使用，运行时零依赖 —— 搜索直接读这份静态 JSON。
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IN = join(__dirname, '../src/data/games.generated.json')
const OUT = join(__dirname, '../src/data/pinyin.generated.json')

const require = createRequire(import.meta.url)
let pinyin
try {
  ;({ pinyin } = require('pinyin-pro'))
} catch {
  console.error('✗ 缺少 pinyin-pro，请先 pnpm add -D pinyin-pro')
  process.exit(1)
}

const games = JSON.parse(await readFile(IN, 'utf8'))
const out = {}

for (const g of games) {
  const hasHan = /[\u4e00-\u9fa5]/.test(g.title)
  if (!hasHan) continue
  out[g.title] = {
    full: pinyin(g.title, { toneType: 'none', type: 'array' }).join(''),
    initials: pinyin(g.title, { pattern: 'first', toneType: 'none', type: 'array' }).join(''),
  }
}

await writeFile(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(`✓ 拼音索引：${Object.keys(out).length} 条 → ${OUT}`)
