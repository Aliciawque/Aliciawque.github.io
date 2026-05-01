---
title: "研究 mattpocock/skills：5 万星的 AI 编程 Skill 包里值得偷什么"
date: 2026-05-01
tags: ["Claude Code", "Skills", "DevTools"]
lang: "zh"
translationSlug: "mattpocock-skills"
excerpt: "Matt Pocock 的 skills 仓库 50k stars，16 个 skill 解决 AI 编程的四大失败模式。最值得偷的不是某个具体 skill，而是 CONTEXT.md 这个概念——给项目建一张结构化术语表，让 AI 和人类说同一种语言。我把它和模块深度分析一起做成了 /sync-context skill。"
canvasRender: false
---

## 起因

Matt Pocock 这个人你可能不认识，但 Total TypeScript 你大概率听过。他在 2026 年 2 月开了个仓库叫 [skills](https://github.com/mattpocock/skills)，定位很直接："Skills for Real Engineers. Straight from my .claude directory."——不是 vibe coding 的玩具，是从几十年工程经验里提炼的实战 skill。

50,600 stars。我决定看看里面到底有什么。

## 四大失败模式

Matt 把 AI 编程的失败归结为四种：

| 失败模式 | 根因 | 对应 Skill |
|---------|------|-----------|
| AI 没做你要的 | 沟通不对齐 | `/grill-me`, `/grill-with-docs` |
| AI 太啰嗦 | 缺共享语言 | CONTEXT.md |
| 代码跑不通 | 缺反馈循环 | `/tdd`, `/diagnose` |
| 代码变屎山 | 不关注架构 | `/improve-codebase-architecture`, `/zoom-out` |

这个框架本身就很清晰。每个 skill 精准解决一个问题，不贪多。

## 16 个 Skill 扫一眼

**工程类（9 个）** 是主体。`/diagnose` 的调试循环设计得最漂亮——Phase 1 不是"看日志"，而是"构建反馈循环"，列出 10 种方式（失败测试、curl、Playwright、trace 回放、fuzz、bisect……），核心理念是 "Build the right feedback loop, and the bug is 90% fixed."

`/tdd` 强烈反水平切片——不要先写所有测试再写实现，而是一个测试 → 最小实现 → 确认 → 下一个。这个和我的 subagent + 双 review 流程互补。

**生产力类（3 个）** 里 `/caveman` 很有趣：压缩 token ~75%，去掉冠词、填充词、客套，保留全部技术精度。永久激活直到用户说 "stop caveman"。

**Misc（4 个）** 是工具类，git-guardrails 拦截危险命令，和我的 `/careful` 类似。

## 最酷的概念：CONTEXT.md

整个仓库最让我兴奋的不是某个具体 skill，而是一个文件格式：**CONTEXT.md**。

核心想法很简单：给每个项目维护一张结构化领域术语表。

```markdown
### Order
- **Definition:** 客户提交的一次购买请求，包含一个或多个 LineItem
- **Avoid:** [purchase, transaction] — 这些词在代码里不应该出现
- **Relations:** Order → has-many → LineItem
```

效果立竿见影：

1. **AI 用项目语言说话**——不会把 Order 叫 purchase，不会把 User 叫 customer
2. **命名一致**——变量、函数、文件的命名遵循统一术语
3. **token 大幅减少**——不用每次解释"这个项目里 Order 就是指..."
4. **新人（人 or AI）上手更快**——读一张表就知道领域语言

Matt 还设了一个 "Avoid" 字段——明确列出**不应该用**的别名。这比正面定义更有效。你告诉 AI "Order" 是什么，同时告诉它 "purchase" 和 "transaction" 在这个项目里是禁止使用的。

## ADR 极简版

另一个好概念是 ADR（Architecture Decision Record）的极简写法：只要 1-3 句话。三个条件全满足才写：

- 难逆转
- 令人意外
- 真实权衡

大部分"决策"不需要 ADR——只有那种回头看会想"当时为什么这么做"的才值得记。

## 模块深化

`/improve-codebase-architecture` 引入了一套精确的架构分析词汇：

- **Depth**（深度）：接口简单 + 实现复杂 = 好模块（如 `fs.readFile`）
- **Seam**（接缝）：可以替换实现的边界，真正的 seam 至少有两个 adapter
- **Locality**（局部性）：相关代码放在一起

核心判断方法：**删除测试法**。如果你删掉一个模块的测试，还能测到它的行为，说明测试在测别的模块——这个模块太浅了，应该合并。

## 和我的 Skill 系统对比

| 维度 | Matt Pocock | 我的系统 |
|------|------------|---------|
| 共享语言 | CONTEXT.md 结构化术语表 | 无统一机制 |
| ADR | 极简 1-3 句 | 无格式 |
| 架构分析 | 模块深化/Depth | 无专门 skill |
| 分发 | .claude-plugin | hook + command |
| 治理 | 无 | ArcKit 范式 + memory |

Matt 的优势在**语言对齐和架构分析**。我的优势在**治理体系**（hook/command/memory 三位一体）。互补。

## 我做了什么

吸收了三个精华概念，做成了一个新 skill：`/sync-context`。

**四个动作：**

- `scan` — 扫描代码库，提取领域术语，创建 CONTEXT.md
- `check` — 验证代码命名与术语表的一致性
- `update` — 添加/修改术语（支持 git diff 检测新术语）
- `map` — 模块深度分析，识别浅模块和真实 seam

CONTEXT.md 的格式把 Matt 的想法和我的实践结合了：术语定义 + Avoid 别名 + 关系 + ADR 极简记录 + Module Map。

## 值不值得抄

**值得偷的：** CONTEXT.md 概念、反馈循环优先、垂直切片、模块深化术语、ADR 极简版、`disable-model-invocation` 防误触。

**不用抄的：** `/grill-me` 纯面试模式（我的 memory 系统已经覆盖了上下文积累）、`/caveman` 压缩模式（中文本身就很紧凑）、`/setup-pre-commit` 这种一次性工具。

一句话总结：**Matt 的 skill 包最有价值的不是某个具体 skill，而是"语言对齐决定思考精度"这个理念。** 当 AI 和你说同一种语言，每次交互的质量都往上提一层。
