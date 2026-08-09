# 第三方内核声明 / Third-Party Core Notice

本目录中的文件**不是** NES Arcade 的原创代码，而是第三方开源模拟器内核的预编译产物。

The files in this directory are **not** original NES Arcade code. They are
pre-compiled binaries of a third-party open-source emulator core.

---

## fceumm_libretro.js / fceumm_libretro.wasm

| 项目 | 内容 |
|---|---|
| 名称 | FCEUmm（libretro 移植版） |
| 上游仓库 | https://github.com/libretro/libretro-fceumm |
| 原始项目 | FCE Ultra / FCEUX 家族，Copyright (C) Xodnizel 等贡献者 |
| 许可证 | **GNU General Public License v2.0 或任一更新版本**（GPL-2.0-or-later） |
| 许可证全文 | https://github.com/libretro/libretro-fceumm/blob/master/Copying |
| 编译目标 | WebAssembly（通过 Emscripten），由 libretro 官方 buildbot 产出 |
| 来源 | https://buildbot.libretro.com/nightly/emscripten/ |

### 为什么本项目整体采用 GPL-3.0

FCEUmm 的源码头部声明为 *"either version 2 of the License, or (at your option)
any later version"*，即 **GPL-2.0-or-later**，因此可以按 GPLv3 条款再分发。
NES Arcade 本体据此采用 **GPL-3.0-or-later**，与内核许可证兼容。

### 源码获取（GPL 第 3 条要求）

本仓库以二进制形式分发 FCEUmm 内核。对应的完整源码可从上游仓库获取：

```bash
git clone https://github.com/libretro/libretro-fceumm.git
```

内核二进制未经本项目修改，与 libretro 官方发布版本一致。

### 如何自行编译内核

```bash
# 需先安装 Emscripten SDK
git clone https://github.com/libretro/libretro-fceumm.git
cd libretro-fceumm
emmake make -f Makefile.libretro platform=emscripten
# 产物拷贝到本目录，命名为 fceumm_libretro.js / fceumm_libretro.wasm
```

---

## 关于 ROM

本目录**不包含**任何游戏 ROM。游戏 ROM 由使用者自行提供，详见项目根目录
[README.md](../../README.md) 的「数据准备」章节。
