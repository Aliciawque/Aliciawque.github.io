---
title: "Hermes Agent 本地安装记：从零到 24 套皮肤随机轮换"
date: 2026-05-25
tags: ["AI Agent", "Terminal", "MiniMax", "Hermes"]
lang: "zh"
translationSlug: "hermes-agent-setup"
excerpt: "把 Nous Research 的开源 AI Agent 装到本地，接上中国的 Coding Plan API，踩了 Python 3.14 的 .pth 坑，最后装了 24 套皮肤做随机轮换。完整踩坑记录。"
canvasRender: false
---

## 为什么装 Hermes Agent

Hermes Agent 是 Nous Research 做的开源 AI Agent——自带工具调用、60+ 内置工具、22 个消息平台集成、技能系统。说白了就是一个可以在终端里跑的 Claude Code 替代品，而且支持自己接各种模型。

我的需求很简单：在终端里有个能干活的 AI 助手，不依赖特定 API provider，能接中国的 Coding Plan。

## 安装：看起来很简单

从 GitHub fork 了仓库，clone 到本地，创建 venv，`pip install -e .`。

然后 `hermes --version`，报错：

```
ModuleNotFoundError: No module named 'hermes_cli'
```

在项目目录里跑没事，出了项目目录就挂。

### Python 3.14 的 .pth 陷阱

排查后发现：Python 3.14 把 `__` 开头的 `.pth` 文件视为 hidden 直接跳过。而 uv 的 editable install 生成的文件恰好叫 `__editable__.hermes_agent-0.14.0.pth`。

用 verbose 模式看得一清二楚：

```
Skipping hidden .pth file: '.../__editable__.hermes_agent-0.14.0.pth'
```

所有 `.pth` 文件都被跳过了，包括 venv 自己的 `_virtualenv.pth`。

**解决方案**：不用 editable install，改普通 install。

```bash
uv pip install --python .venv/bin/python "."   # 不加 -e
```

代价是更新后要重新 install，但这比每次从项目目录启动强太多了。

## 配置 MiniMax Coding Plan

MiniMax 的 Coding Plan（也叫 Token Plan）key 以 `sk-cp-` 开头，每月有额度。Hermes 内置了 `minimax-cn` provider，直接配 `.env` 就行。

但 `.env` 有两个位置要配：

- `~/.hermes/.env` — TUI 版（`hermes chat`）读这个
- 项目目录 `.env` — 非 TUI 版（`hermes-agent`）读这个

只配了一个，进去就报 `No inference provider configured`。

MiniMax CN provider 默认走 Anthropic Messages 兼容端点（`https://api.minimaxi.com/anthropic`），`sk-cp-` key 在这个端点也能正常工作。

验证余额可以用 curl：

```bash
curl https://api.minimaxi.com/v1/token_plan/remains \
  -H "Authorization: Bearer sk-cp-xxx"
```

## 加上智谱 GLM

智谱的 Coding Plan key 格式是 `{id}.{secret}`，Hermes 里叫 `zai` provider。配了 `GLM_API_KEY` 和 `GLM_BASE_URL`，设成默认模型。Hermes 甚至有自动探测功能——它会依次尝试 global、cn、coding-global、coding-cn 四个端点，找到能用的那个。

现在两个 provider 都配好了：
- 默认：智谱 GLM-5.1（Coding Plan）
- 备选：MiniMax M2.7（Token Plan）

## 24 套皮肤随机轮换

Hermes 有皮肤系统（skin），改的是颜色、banner、spinner 这些视觉元素，不改行为。内置 9 个，社区又有 15 个。

从 [hermes-skins](https://github.com/joeynyc/hermes-skins) 下载所有 `.yaml` 丢到 `~/.hermes/skins/`，写了一个 wrapper 脚本实现：

1. 收集所有可用皮肤（内置 + 用户安装）
2. 从 `~/.hermes/.skin_rotation` 读取轮换状态
3. 从剩余池里取下一个，不重复
4. 全部轮完后重新洗牌
5. 写入 `config.yaml` 的 `display.skin`，然后启动 hermes

踩的坑：wrapper 第一版用 `python3 + pyyaml` 写 config，后来改成纯 `sed`，因为依赖越少越好。`~` 展开也不可靠，全改成 `$HOME`。

在 `~/.zshrc` 加一行 alias：

```bash
alias hermes='~/Documents/hermes-agent/hermes-wrapper.sh'
```

新开 Ghostty 窗口，输入 `hermes`，每次都是不同皮肤。

## 最终效果

打开终端，输入 `hermes`，一个随机皮肤的 AI 助手就出来了。可以聊天、执行命令、搜索网页、管理文件。两个中国 Coding Plan 轮着用，基本上不花钱。

### 配置文件速查

```yaml
# ~/.hermes/config.yaml
model:
  default: zai/glm-5.1
terminal:
  backend: local
display:
  skin: <由 wrapper 自动轮换>
```

```bash
# ~/.hermes/.env
MINIMAX_CN_API_KEY=sk-cp-xxx
GLM_API_KEY=xxx.yyy
GLM_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
```

## 踩坑清单

| 问题 | 原因 | 解决 |
|---|---|---|
| `ModuleNotFoundError` 从其他目录运行 | Python 3.14 跳过 `__` 开头 .pth | 非 editable install |
| `.env` 找不到 provider | TUI 和非 TUI 读不同 .env 路径 | 两个位置都配 |
| MiniMax CN 404 | URL 路径不对 | `minimax-cn` provider 默认用 Anthropic transport |
| 皮肤不随机 | wrapper 里 `~` 没展开 / pyyaml 依赖 | `$HOME` + sed |
| `hermes-agent` 没有 `--provider` | 非 TUI 版 CLI 参数有限 | 用 `hermes chat` |
