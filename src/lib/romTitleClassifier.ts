/**
 * 基于 ROM 文件名的轻量启发式分类。
 *
 * 不依赖 CRC32 / 外部数据库，专门用于：
 * 1. CRC 未命中的汉化版 / 修正版 / 不同 dump ROM；
 * 2. 对 persisted customGames 做离线迁移（避免把 80KB 的 genre 表拖入主包）。
 */
import type { Category } from '@/types/game'

const TITLE_RULES: Array<[string[], Category]> = [
  // shooter
  [
    [
      '魂斗罗',
      '绿色兵团',
      '赤色要塞',
      '沙罗曼蛇',
      '宇宙巡航机',
      '雷电',
      '兵蜂',
      '1942',
      '1943',
      '空中魂斗罗',
      'gradius',
      'salamander',
      'contra',
      'duck hunt',
    ],
    'shooter',
  ],
  // fighting
  [
    [
      '街头霸王',
      '拳皇',
      '双截龙',
      '忍者神龟',
      '热血格斗',
      '热血物语',
      '热血高校',
      '功夫',
      'street fighter',
      'kof',
    ],
    'fighting',
  ],
  // sports
  [
    [
      '赛车',
      '足球',
      '篮球',
      '网球',
      '棒球',
      '高尔夫',
      '运动会',
      '滑雪',
      '滑冰',
      'f1',
      'fifa',
      'nba',
      'racing',
      'soccer',
      'baseball',
      'tennis',
      'golf',
    ],
    'sports',
  ],
  // puzzle
  [['俄罗斯方块', 'tetris', '消消乐', '华容道', '挖金子', '推箱子', '拼图'], 'puzzle'],
  // board
  [
    [
      '中国象棋',
      '象棋',
      '围棋',
      '五子棋',
      '麻将',
      '军棋',
      '斗兽棋',
      '飞行棋',
      'chess',
      'mahjong',
      '棋',
      '牌',
    ],
    'board',
  ],
  // rpg
  [
    [
      '勇者斗恶龙',
      '最终幻想',
      '吞食天地',
      '重装机兵',
      '火焰纹章',
      'dragon quest',
      'final fantasy',
    ],
    'rpg',
  ],
  // multicart
  [['合卡', '多合一', 'multicart'], 'multicart'],
  // action
  [
    [
      '马里奥',
      '超级玛丽',
      '玛丽',
      '冒险岛',
      '高桥名人',
      '恶魔城',
      '忍者龙剑传',
      '洛克人',
      '大力水手',
      '松鼠大战',
      '敲冰块',
      '气球大战',
      'mario',
      'castlevania',
      'megaman',
      'popeye',
    ],
    'action',
  ],
]

// 按关键词长度降序，优先匹配更具体的词
const KEYWORDS = TITLE_RULES.flatMap(([words, cat]) => words.map((w) => ({ word: w, cat })))
KEYWORDS.sort((a, b) => b.word.length - a.word.length)

function normalizeTitle(name: string): string {
  return (
    name
      .replace(/\.nes$/i, '')
      .replace(/[（(]\s*[^）)]+\s*[）)]/g, ' ')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase()
  )
}

export function classifyByTitle(title: string): Category {
  const t = normalizeTitle(title)
  for (const { word, cat } of KEYWORDS) {
    if (t.includes(word.toLowerCase())) return cat
  }
  return 'action'
}
