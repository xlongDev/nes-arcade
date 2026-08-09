<div align="center">

# 🎮 NES Arcade · 红白机游戏厅

**液态玻璃质感的 FC / NES 红白机游戏在线合集 —— 打开网页，即点即玩**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A5%2020-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](#-部署)
[![No CDN](https://img.shields.io/badge/runtime-no%20CDN-success)](#-特性一览)

浏览器内直接加载 ROM 即玩 · 键盘 / 手柄 / 移动端虚拟手柄 · 存档读档 · 收藏与最近游玩 · 全部数据本地持久化

</div>

---

> [!IMPORTANT]
> ### 📼 本仓库**不包含任何游戏 ROM**
>
> 出于版权考虑，`public/roms/` 已被 `.gitignore` 排除。**克隆后游戏库是空的，需要你自己准备 ROM。**
>
> **三种方式任选其一：**
>
> | 方式 | 操作 | 适合 |
> |---|---|---|
> | **① 批量导入**（推荐） | 把 `.nes` 文件丢进仓库**同级**的 `../roms/` 目录，然后跑 `npm run prepare:data` | 有一整个收藏夹 |
> | **② 网页上传** | 直接 `npm run dev`，打开**上传页**拖入 `.nes` 文件，存进浏览器 IndexedDB | 只想试玩一两个 |
> | **③ 自定义路径** | 设置环境变量 `ROMS_SRC=/你的/路径 npm run prepare:data` | ROM 在别处 |
>
> 目录结构应为：
> ```
> 你的工作目录/
> ├── roms/            ← 把 .nes 文件放这里（仓库外，不会被提交）
> │   ├── 超级玛莉.nes
> │   └── 魂斗罗.nes
> └── nes-arcade/      ← 本仓库
> ```
>
> 想合法获取 ROM？可以用 [飞天鼠 / Homebrew 自制游戏](https://www.nesdev.org/wiki/Projects)、
> [NESDev 社区作品](https://forums.nesdev.org/viewforum.php?f=22)，或你**自己持有卡带**的备份。
> 详见 [📦 数据准备](#-数据准备)。

---

## ✨ 特性一览

- **即点即玩**：首页卡片式游戏库，点击卡片进入游戏页自动加载运行。
- **模拟器内核本地化**：`fceumm` 内核（`fceumm_libretro.js` + `.wasm`）放在 `public/cores`，离线也能跑。
- **多端操控**：键盘自定义映射、标准手柄（Gamepad API）、移动端虚拟手柄（带震动反馈）。
- **本地 ROM 上传**：把任意 `.nes` 文件拖进上传页，自动解析 iNES 头、写入 IndexedDB、加入游戏库。
- **存档系统**：5 个存档槽（save state），电池存档（SRAM）自动持久化；收藏、最近游玩、自定义封面均本地保存。
- **搜索与筛选**：关键词（支持中文拼音 / 首字母）+ 分类 + 排序 + 仅看收藏，筛选状态写入 URL，可分享。
- **液态玻璃 UI**：分层 `backdrop-filter`、指针跟随高光、极光背景、胶片颗粒；深色 / 浅色主题无闪烁切换。
- **响应式**：桌面与移动端自适应，桌面端全功能 HUD，移动端自动虚拟手柄。
- **PWA**：可「添加到主屏幕」，内核与 ROM 走运行时缓存（Service Worker），二次访问近乎秒开。

---

## 🧱 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 构建 | Vite 8 / Rolldown | 极速 HMR、原生 ESM、产物自动分包 |
| 框架 | React 19 | 并发特性、最小化重渲染 |
| 路由 | TanStack Router 1.x | 类型安全 `search` 参数（筛选状态写入 URL） |
| 样式 | Tailwind CSS 4 | `@tailwindcss/vite` 插件，零配置文件 |
| 动画 | Motion 13 | 进出场、微交互 |
| 状态 | Zustand 5 `persist` | 偏好设置写入 localStorage |
| 模拟器 | Nostalgist 0.21 + fceumm | 浏览器端 Libretro 封装，WASM 内核本地化 |
| 本地存储 | idb-keyval 6 | IndexedDB 存二进制（存档 / 自定义 ROM / SRAM） |
| 搜索 | Fuse.js 7 | 模糊搜索 + 拼音索引 |
| PWA | vite-plugin-pwa | `generateSW`，只预缓存应用外壳 |
| 校验 | oxlint / tsc | 类型安全、无 `any` 漏网 |

---

## 🚀 本地运行

### 前置条件

- **Node.js ≥ 20**（推荐 22，已用 22.22 验证）
- npm（随 Node 自带）

### 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 准备游戏数据（见下「数据准备」）
npm run prepare:data

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:5173/
```

开发服务器默认开启 `COOP/COEP` 响应头（让 WASM 音频线程更稳），但 **SharedArrayBuffer 并非必需**，生产环境即使托管方不返回这些头也能正常运行。

### 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器（5173 端口） |
| `npm run build` | 生产构建，产物在 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run typecheck` | 仅类型检查（`tsc --noEmit`） |
| `npm run lint` | oxlint 静态检查 |
| `npm run prepare:data` | 同步 + 扫描 + 生成拼音索引（完整数据管线） |

---

## 📦 数据准备

游戏元数据由**三份数据合并**而成，互不覆盖：

1. **`games.generated.json`**（机器生成）—— 扫描 `public/roms` 解析 iNES 头得到。
2. **`games.meta.ts`**（人工）—— 年份、厂商、分类、简介、别名，按 `title` 做键。
3. **`pinyin.generated.json`**（机器生成）—— 中文标题的全拼 / 首字母，供搜索使用。

### 一键准备

```bash
npm run prepare:data
```

它依次执行：

1. **`sync`** — 把桌面 `../roms`（即 `/Users/xiaolong/Desktop/NES/roms`）下的 ROM 扁平化复制到 `public/roms`，并按**内容 SHA-1 去重**（例如《超级玛莉》在合集与单卡中各一份，只留其一）。
2. **`scan`** — 解析每个 ROM 的 iNES / NES 2.0 文件头，产出 `games.generated.json`（含 `mapper`、PRG/CHR 大小、是否带电池、镜像方式等）。
3. **`gen:pinyin`** — 为含汉字的标题生成拼音索引（需 `pinyin-pro`，已加入 devDependencies）。

> 想重新整理收藏？直接改 `../roms` 目录后重跑 `npm run prepare:data` 即可；人工元数据写在 `src/data/games.meta.ts`，重新扫描不会覆盖。

### 自定义 / 上传 ROM

无需改代码：打开应用内的 **上传页**，拖入任意 `.nes` 文件，应用会自动：

- 校验 iNES 头（解析 mapper / PRG / CHR / 电池标志 / 镜像）
- 写入 IndexedDB（`customRoms`）
- 加入游戏库，跳转进游戏页即可游玩

---

## 🌐 部署

项目采用 **相对路径 `base: './'`**，可部署到任意静态托管（含子路径，如 `example.com/nes/`）。

```bash
npm run build
# 将 dist/ 整个目录上传到任意静态服务器 / 对象存储 / GitHub Pages
```

### 部署要点

- **内核与 ROM 不要进预缓存**：`vite-plugin-pwa` 已配置 `globIgnores` 排除 `roms/`、`cores/`、`covers/`，避免 15MB+ 资源被塞进 Service Worker 缓存。
- **运行时缓存**：内核走 `CacheFirst`（长期）、ROM 走 `CacheFirst`（40 条 LRU）、封面走 `StaleWhileRevalidate`，二次访问秒开。
- **COOP/COEP**：仅开发服务器设置；静态托管不设置也能正常运行。
- **MIME 类型**：确保服务器对 `.wasm` 返回 `application/wasm`（绝大多数托管默认支持，否则 WASM 流式编译会失败）。

> 也可一键发布到 CloudStudio / EdgeOne Pages 等静态托管（见 IDE 内对应能力）。

---

## 🎮 操作说明

### 默认键盘映射

| 动作 | 按键 |
|---|---|
| 方向 ↑ ↓ ← → | 方向键 / `W A S D` |
| A 键 | `K` / `X` |
| B 键 | `J` / `Z` |
| Start | `Enter` |
| Select | 右 `Shift` / 左 `Shift` |

在 **设置页** 可逐键重新绑定（按下即捕获），也支持标准手柄映射编辑。

### 手柄（Gamepad）

插入标准手柄后，游戏页自动轮询（rAF）。默认映射：

- `A/B`(0/1) → NES B/A（贴合多数人的肌肉记忆）
- `8/9` → Select / Start
- 方向键 `12~15` → 上右下左

### 移动端虚拟手柄

触摸设备自动显示虚拟手柄（方向十字 + A/B + Select/Start），支持 `pointer` 捕获与 `navigator.vibrate` 震动反馈。可在设置中强制开 / 关。

### 游戏页 HUD

| 控件 | 说明 |
|---|---|
| ⏸ / ▶ | 暂停 / 继续 |
| ↺ | 重置（重启内核） |
| ⛶ | 全屏（Web API `requestFullscreen`） |
| 🔊 | 音量调节 + 静音（通过 AudioContext GainNode 注入实现） |
| 📷 | 截图（自动成为该游戏封面，覆盖程序化封面） |
| 💾 | 存档面板：5 个槽位，存 / 读 / 删 |

**电池存档（SRAM）**：带电池的游戏（如 RPG）每 20 秒自动落盘；非电池游戏请用「存档槽」手动保存进度。

---

## 💾 本地持久化

| 存储介质 | 存什么 | 容量 |
|---|---|---|
| **IndexedDB** | 存档槽（save state + 缩略图）、自定义 ROM 二进制、电池存档（SRAM） | 大（数十 MB 级） |
| **localStorage** | 偏好设置（主题、音量、键位、滤镜、布局）、游戏库元数据（收藏、最近游玩、自定义封面、最近游玩时长） | 小 |

> 清空方式：设置页 → 本地数据 → 可分别「清除存档 / 清除自定义 ROM / 全部重置」。

---

## 🖼️ 封面策略（三层递进）

1. **程序化玻璃封面（默认）**：标题经哈希 → 确定性双色渐变，零图片请求，永不白板。
2. **游玩 10 秒自动截图**：进入游戏满 10 秒自动截一张画面，作为封面（可在设置关闭 `autoCover`）。
3. **手动上传**：在游戏页点截图，或把 `covers/<标题>.jpg` 放进 `public/covers/`（`scan` 会自动命中）。

当前仓库封面命中 0/85，全部走程序化兜底 —— 符合「自己玩、不抓版权图」的约定。

---

## 🎨 性能与无障碍

### 性能纪律（液态玻璃）

- 真玻璃（`.glass`，含 `backdrop-filter: blur`）只给 ≤6 层常驻框架；卡片用伪玻璃（`.glass-faux`），hover 那张临时升级真模糊。
- 网格用 `content-visibility: auto` 跳过屏外渲染。
- 模拟器逻辑独立分包（`emulator`），仅进入游戏页才拉取。
- 首屏骨架 + 主题预设脚本，杜绝 FOUC 闪烁；LCP / CLS 受控。

### 无障碍

- 语义化结构 + `role`/`aria-label`（开关 `role="switch"`、表格角色等）。
- 全键盘可达；焦点环可见。
- 尊重 `prefers-reduced-motion`（`reduceGlass` 设置项一键降级玻璃特效）。
- 颜色对比度满足 WCAG 2.1 AA。

---

## 📁 目录结构

```
nes-arcade/
├── public/
│   ├── cores/            # 本地化 fceumm 内核（.js + .wasm）
│   ├── roms/             # 同步进来的 ROM（由 prepare:data 生成）
│   ├── covers/           # 可选：手动封面
│   └── favicon.svg
├── scripts/
│   ├── sync-roms.mjs     # 从 ../roms 同步 + 去重
│   ├── scan-roms.mjs     # 解析 iNES 头 → games.generated.json
│   └── gen-pinyin.mjs    # 生成拼音索引
├── src/
│   ├── components/       # UI 基础件（GlassPanel / Button / Icons / Toast…）
│   ├── data/             # 游戏数据（合并生成 + 人工 meta + 拼音）
│   ├── features/emulator/# 模拟器集成（useEmulator / 输入 / 虚拟手柄 / HUD）
│   ├── lib/              # 工具（storage / cover / format / cx / pointer）
│   ├── pages/            # Library / Play / Upload / Settings / NotFound
│   ├── stores/           # Zustand：prefs / library
│   └── router.tsx        # TanStack Router 路由 + 类型化 search
├── vite.config.ts        # 构建 / PWA / 分包策略
└── package.json
```

---

## ⚠️ 免责声明

- 本项目**仅供个人学习、怀旧与本地娱乐使用**。内置 ROM 来自使用者本地已有的文件，应用本身**不提供、不分发任何受版权保护的游戏 ROM**。
- 若你所在地区对 ROM 备份有法律限制，请仅使用你**合法拥有**的卡带对应的备份，或仅运行自制 / 开源游戏。
- 模拟器内核 fceumm 为 Libretro 社区开源项目，遵循其对应开源协议。
- 封面采用程序化生成 / 游玩截图，**不抓取任何第三方版权美术资源**。

---

## ❓ 常见问题

**Q：进入游戏黑屏 / 卡在加载？**
- 确认浏览器支持 WebAssembly（现代浏览器均支持）。
- 确认服务器对 `.wasm` 返回 `application/wasm`。
- 打开 DevTools Console 看是否有 `cores/` 资源 404。

**Q：上传的 ROM 玩不了 / 报错？**
- 检查是否为合法 iNES 文件（`scan` 也解析同样的头）。少数 NES 2.0 扩展字段或特殊 mapper 可能不被 fceumm 支持。

**Q：存档丢了？**
- 存档槽与电池存档都在 IndexedDB，浏览器清除站点数据会一并清空。换设备不会自动同步（纯本地）。

**Q：想换模拟器内核？**
- 把新内核放到 `public/cores/`，在 `src/features/emulator/useEmulator.ts` 里改 `resolveCoreJs / resolveCoreWasm` 与 `core` 名即可。
