---
title: "OpenWolf 调研：值得偷的两个齿轮，跳过整套机器"
date: 2026-04-28
tags: ["Claude Code", "Hooks", "DevTools"]
lang: "zh"
translationSlug: "claude-code-second-brain"
excerpt: "OpenWolf 自称 Claude Code 的第二大脑，931 stars。调研一圈发现 90% 我用 hook + memory 系统已经有了——但两个具体机制值得偷：Read 之前给 Claude 注入文件描述+token 估算，bug 修复记忆去重。做成 ~/.claude/hooks/ 风格的两个 hook 加两个 CLI，铺到 4 个项目；写到一半 hook 在这次会话里实时触发，提醒我 README.md 还没填描述。这是闭环的瞬间。"
canvasRender: false
---

## 起因

朋友丢来一条链接：[github.com/cytostack/openwolf](https://github.com/cytostack/openwolf)。号称"a second brain for Claude Code"，931 stars，一个多月就到这量级。看起来像我会感兴趣的工具。

让 Claude 拉 README 给我看：6 个 hook + 一个 `.wolf/` 目录，分别管文件地图（anatomy.md）、学习记忆（cerebrum.md）、token 账本（token-ledger.json）、bug 记忆（buglog.json）、动作日志（memory.md）。号称平均省 65.8% token。

调研开源工具的第一直觉应该是：**这玩意儿和我现在的栈重合度有多高？**

## 重合度审计

我列了一个对照表：

| OpenWolf 提供的 | 我已经有的 |
|---|---|
| 6 个项目级 hook | `~/.claude/hooks/` 危险拦截、自动批准、权限通知、vault lint 预扫 |
| `cerebrum.md` 学习记忆 + Do-Not-Repeat | `~/.claude/projects/-Users-kjm/memory/` auto-memory（user/feedback/project/reference 四类） |
| `memory.md` 动作日志 | `claude-mem` 插件 |
| token-ledger 账本 | `claude-hud` statusline 已经在显示 |
| `anatomy.md` 文件地图 | **空白** |
| `buglog.json` bug 去重 | **空白** |

90% 重合。整套装上去会跟我现有的 memory governance 打架——尤其是 `cerebrum.md` 和我的 feedback memory 完全重叠，但格式不同；Do-Not-Repeat 清单和我已经在用的 feedback 记忆是同一回事。token-ledger 是估算（chars/4），不如 statusline 实时显示真实 API 计费。`memory.md` 动作日志我从来没翻过——那是给人看的，但我从来没看。

剩下两块是真的没有：**anatomy.md 给 Claude 在 Read 之前预告文件多大、做啥用**；**buglog.json 在 Claude 准备开调之前提示"这个 bug 之前修过，方案是 X"**。

整套装会带来 70% 噪音换 30% 价值。手动偷 30% 值得做。

## 偷哪两个齿轮

**Anatomy injection**——Claude 准备 Read 一个文件，hook 在前面拦一道，把文件地图里对应行喂给它："📋 anatomy: src/server.ts (~520 tok) — Express HTTP server with middleware chain"。同会话第二次读同一个文件，再警告一次："⚡ already read this session, consider using existing knowledge"。

**Buglog dedup**——用户输入触发 bug 关键词（error / fix / TypeError / throwing 等），hook 在 prompt 进 Claude 之前先搜项目的 `.claude/buglog.json`，把命中的历史修复方案塞进 `additionalContext`。

两个机制都是**让 Claude 少做一次冗余动作**。前者减少 Read 调用，后者减少同一个 bug 第二次从零开始调试。

## 实现

照我现有 hook 风格写，不引入新依赖：

- `~/.claude/hooks/anatomy-inject.mjs` — PreToolUse matcher=Read，向上找 `.claude/anatomy.md`，命中就走 `hookSpecificOutput.additionalContext`
- `~/.claude/hooks/buglog-search.mjs` — UserPromptSubmit，正则触发 + 项目本地 buglog.json 搜索 + top-3 注入
- `~/.claude/bin/anatomy` — `build` / `refresh`（保留描述）/ `list` / `path` / `clear`
- `~/.claude/bin/buglog` — `add`（参数或管道 JSON）/ `search` / `list` / `show` / `rm`

存储是项目本地：`<project>/.claude/anatomy.md` 和 `<project>/.claude/buglog.json`。没装 anatomy / buglog 的项目走 hook 时会找不到状态文件，**静默 exit 0，零开销**。这是 OpenWolf 没做到的——它是全局 opt-in，而我是项目 opt-in，每个项目自己决定要不要装。

Anatomy 格式选 markdown 表格而不是 JSON，因为我和 Claude 都要能直接编辑：

```markdown
## src/

| File | Tokens | Description |
|------|-------:|-------------|
| `index.ts` | 180 | Main entry point. Exports createProgram() for CLI. |
| `server.ts` | 520 | Express HTTP server, mounts middleware, listens on PORT. |
```

Token 估算就用 `bytes/4`，跟 OpenWolf 一致（误差 ±15%），够用。

## 跑起来

写完之后跑了一个临时项目过 7 项 smoke test，全过。然后挑 4 个真项目铺：

| 项目 | 文件数 | 描述完成度 |
|---|---|---|
| Soulbound iOS | 30 | 86% |
| agent-pack-platform | 110 | 40% |
| polylens | 101 | 27% |
| personal-blog（这个博客） | 88 | 26% |

剩下没填的都是 tests / boilerplate / 需要逐文件读才能描述的小 component。值得填的我让 Claude 一次性读关键文件 + 解析 CLAUDE.md（博客的 CLAUDE.md 已经把所有重要文件描述列了一遍，直接迁移），剩下的让 hook 注入"_(no description in anatomy — consider adding one)_"，等真要 Read 的时候顺手补。

把两条 feedback memory 嵌进对应文件描述里：

- Soulbound 的 `CampaignViewModel.swift` 描述末尾加："NOTE: per feedback_swiftui_navigation, .task in NavigationLink destinations does NOT trigger @Published — use .onChange/onReceive."
- 博客的 `CanvasArticle.tsx` 描述末尾加："IMPORTANT: only render `excerpt` here, NOT full content (per feedback_blog_canvas_text — full content breaks layout)."

下次 Claude 改这些文件，Read 之前自动看到这两条规则。**规则跟着文件走**，不再依赖我口头提醒。

## 闭环的瞬间

写到博客这部分时，让 Claude 读 polylens 的 `README.md` 了解项目结构。Read 触发的瞬间，新装的 hook 跳出来：

> 📋 anatomy: `README.md` (~1,088 tok) — _(no description in anatomy — consider adding one)_

我刚装的工具，在我装它的会话里，开始提醒我自己还有事没做完。

这不是验证 demo，是真的闭环了。

## 这种调研值得复刻

我从这次调研里抽出来的工作流：

1. **不要先装。** 先列对照表，看重合度。
2. **找出 30%。** 整套装上去会有摩擦，但具体某几个机制可能是真的空白。
3. **照自己的风格重写。** OpenWolf 是 6 个 hook + 一个 `.wolf/` 目录，全局 opt-in；我重写成 2 个 hook + `<project>/.claude/`，项目 opt-in。原作的设计意图我留住了（Read 前注入、bug 去重），但 packaging 完全适配我的栈。
4. **承认 0% 也是合法答案。** 我承认我不要 token-ledger（statusline 已经做了）、不要 cerebrum（memory 系统已经做了）、不要 memory.md（我不看）。这不是吝啬，是不想引入冗余。

调研开源工具，最大的产出经常不是装上它，而是知道**哪两块零件值得偷**。

整套机器留在原处。