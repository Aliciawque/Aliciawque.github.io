---
title: "React Doctor：AI 写的 React 代码，谁来把关？"
date: 2026-05-13
tags: ["React", "AI", "代码质量", "工具"]
lang: "zh"
translationSlug: "react-doctor"
excerpt: "Million.js 团队出了个 React 代码健康诊断工具，一条命令给项目打 0-100 分。3 个月 9K stars，月下载 40 万。我研究了它的架构、规则体系、agent 集成机制，顺手给它做了个 Claude Code skill。"
canvasRender: false
---

## 问题是真的

2026 年了，大部分 React 代码是 AI 写的。Cursor、Claude Code、Codex 每天生成数百万行 JSX。写功能没问题，但它们不知道什么叫"好的 React"——useEffect 里塞三个 setState、array index 当 key、dangerouslySetInnerHTML 随处可见。

ESLint 能抓一部分，但配置痛苦，规则分散在五六个插件里，跑起来还慢。更关键的是：ESLint 不给你一个整体评估。它一个一个报错，你不看全貌就不知道项目到底是"还行"还是"该重写"。

## React Doctor 是什么

[React Doctor](https://github.com/millionco/react-doctor) 是 [Million.js](https://million.dev) 团队（Aiden Bai）的新项目。一句话：**一条命令扫描你的 React 项目，输出 0-100 的健康评分 + 可操作的修复建议。**

```bash
npx react-doctor@latest .
```

评分分档：
- **75-100 (Great)** — 放心发
- **50-74 (Needs work)** — 先修再发
- **<50 (Critical)** — 别合并了

它检查六个维度：state & effects、performance、architecture、security、accessibility、dead code。规则会根据你的框架（Next.js、Vite、React Native）和 React 版本自动切换。

## 为什么快

底层引擎是 **oxlint**——Rust 写的 linter，比 ESLint 快 50-100 倍。扫描 tldraw 那种规模的项目，几秒出结果。dead code 检测用的 **Knip**，专门找未使用的 exports、deps 和 types。

这不是又一个 ESLint 插件。它是把 lint + dead code + 框架感知规则整合成一个零配置体验的上层封装。

## 最有意思的设计：Agent 集成

```bash
npx react-doctor@latest install
```

这条命令会检测你本地装了哪些 coding agent——Claude Code、Cursor、Codex、OpenCode 等 50+ 种——然后给它们安装 React 最佳实践规则。不是给你看的，是教 AI 在写代码时就避免反模式。

这个设计很聪明。与其事后扫出问题再修，不如让 agent 一开始就别写烂代码。 Million 团队显然看到了 AI coding 的大趋势，精准定位了这个痛点。

## 技术架构速览

| 层 | 技术 | 说明 |
|---|---|---|
| 扫描引擎 | oxlint (Rust) | 60+ 规则，极快 |
| Dead code | Knip | 未使用 exports/deps/types |
| CLI | Commander.js | --json / --diff / --staged / --explain |
| 配置 | react-doctor.config.json | 忽略规则/文件/目录 |
| 集成 | oxlint plugin + ESLint flat config | 两套都支持 |
| CI | GitHub Action | PR 自动评论评分 |

`--json` 输出结构化数据，`--diff main` 只扫变更文件，`--staged` 给 pre-commit hook 用，`--explain file:line` 解释为什么某条规则触发。API 设计得很干净。

Node.js API 也暴露了：`import { diagnose } from "react-doctor/api"`，可以编程式调用，拿 score 和 diagnostics。

## 排行榜

他们跑了一些知名项目：

| 项目 | 评分 |
|---|---|
| executor | 96 |
| nodejs.org | 87 |
| tldraw | 76 |
| excalidraw | 69 |
| rocket.chat | 67 |

nodejs.org 87 分——Next.js 项目能到这个分数挺不错。excalidraw 69，说明即使是明星项目，AI 时代的 React 最佳实践也在进化。

## 它不是什么

说清楚局限：

**不是 ESLint 替代品。** 60+ 规则覆盖面广但深度不如多年积累的 ESLint 生态。它更像一个"快速体检"，不是"全科技诊"。

**版本 0.x。** API 可能变，不适合对稳定性要求极高的 CI 流水线。

**单一核心开发者。** Aiden Bai 占 88% 的 commits。bus factor 很低。如果他不维护了，项目就悬了。

**静态分析。** 抓不到运行时问题（不必要的重渲染、内存泄漏）。运行时还得靠 React Profiler 或 React Scan。

**评分算法黑盒。** 0-100 怎么算的没完全公开。分数可以横向对比同规则集的项目，但跨框架比不太公平。

## 我做了什么

研究完之后，我给 Claude Code 写了个 [react-doctor skill](https://github.com/millionco/react-doctor)：

```bash
~/.claude/skills/react-doctor/SKILL.md
```

效果是：当我在 React/Next.js 项目里做代码审查时，Claude Code 会自动跑 react-doctor 扫描，把结果合并到 review 里——不是两份独立报告，而是统一的诊断。用 `--diff` 模式只扫变更文件，review PR 时特别合适。

## 值不值得用

如果你在用 AI coding agent 写 React，**值得试一下**。零配置，一条命令，30 秒出结果。即使不集成到 CI，偶尔跑一次看看项目健康度也很有价值。

如果你已经有完善的 ESLint + CI 流程，增量价值取决于规则质量——先跑一次 `npx react-doctor@latest . --json`，看看它报的东西你现有工具有没有覆盖到。

---

三个月 9K stars、月下载 40 万、核心贡献者在同一个领域有 Million.js 的积累。这个项目值得关注。
