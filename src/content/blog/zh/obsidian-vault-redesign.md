---
title: "用 AI 重新整理 Obsidian：从乱到结构化"
date: 2026-04-07
tags: ["AI", "效率", "经验分享"]
lang: "zh"
translationSlug: "obsidian-vault-redesign"
excerpt: "430 个文件，74% 是过期数据，20 多个平铺文件夹。我研究了 Karpathy 的 LLM Wiki 模式、Obsidian Mind 模板和 Graphify 知识图谱工具，让 Claude Code 在一个小时内完成了整个 vault 的重新设计。117 个笔记，3 层目录，142 个知识图谱节点。"
canvasRender: false
---

## 问题

我的 Obsidian vault 用了半年，积累了 430 个 markdown 文件。

听起来不少，但真正有价值的知识笔记只有约 110 篇。剩下的 308 个文件全是 OpenClaw 项目的对话存档和身份配置文件——一个已经结束的 AI 陪伴项目的遗产。

目录结构是这样的：20 多个平铺文件夹，Mari、houdini、vex、USD、ds、cop、nuke、katana、ps、ue、酒馆、终端工具、claude code、AI研究、gpt、web、工作流、RK900、Vellum、Excalidraw……每个文件夹 1-23 个文件不等。

HOME.md 是唯一的目录页，手动维护。Frontmatter 只有 tags，有的连 tags 都没有。找笔记靠搜索和记忆力。

是时候改了。

## 三个灵感来源

我研究了三个项目，每个都有不同的核心理念：

### Karpathy 的 LLM Wiki 模式

Andrej Karpathy 写了一个 gist，描述了三层知识管理架构：

1. **原始资料层**——不可变的原始文档
2. **Wiki 层**——LLM 生成和维护的 markdown 页面，带摘要、实体页和交叉引用
3. **Schema 层**——一个 CLAUDE.md 文件，定义 wiki 的结构和工作流

核心洞察：LLM 不会因为维护几十个页面的交叉引用和一致性而感到无聊。人会放弃的簿记工作，对 LLM 来说是结构性可管理的。

人负责策展和战略思考，LLM 负责苦力活。

### Obsidian Mind

Brenno Ferrari 的 vault 模板，专为 Claude Code 设计。按用途分文件夹（work/brain/reference/thinking/），有 5 个生命周期 hook，9 个专用子代理，日常 standup/wrap-up 工作流。

这个项目很完整，但它是为打工人设计的——有绩效追踪、brag doc、1:1 记录、peer scan。我不需要这些。

我从中取了几个好主意：thinking/ 草稿区（2 周内晋升或删除）、模板系统、「文件夹按用途分，链接按意义分」的哲学。

### Graphify

一个 AI 知识图谱生成器，把代码、文档、论文、图片变成可查询的知识图谱。双 pass 架构：先用 tree-sitter 提取代码结构，再用 Claude 子代理并行提取文档概念。输出交互式 HTML 可视化 + JSON + 审计报告。

## 设计方案

综合三个项目的理念，针对我的实际情况设计：

**目录结构**：三大领域顶层分开——`3d/`（VFX/3D）、`ai/`（LLM/AI 开发）、`dev/`（开发工具），每个领域下再按工具或主题分子目录。不过度嵌套，最多两层。

**Claude 集成**：采用 Karpathy 的 schema 思路，在 vault 根目录放一个 CLAUDE.md，定义每个文件夹放什么、frontmatter 规则、命名规范、ingest 流程和 lint 规则。不用 Obsidian Mind 那样的 hook 自动分类——保持手动控制。

**两个 slash command**：`/ingest` 处理新内容（自动分类 → 创建笔记 → 添加交叉引用），`/vault-lint` 健康检查（孤立笔记、缺失 frontmatter、失效链接）。

**知识图谱**：用 Graphify 对 vault 和项目代码分别生成图谱。

## 执行

整个迁移用 Claude Code 的 subagent-driven development 模式完成——每个任务派一个子代理，并行执行独立任务。

9 个任务，8 个 git commits：

1. **建目录**——18 个新子目录
2. **迁移脚本**——Python 脚本处理 120 个文件的移动
3. **模板**——knowledge、project、thinking 三个模板
4. **CLAUDE.md**——vault schema
5. **Frontmatter 标准化**——117 个文件全部补齐 title/domain/tags/created/status
6. **HOME.md 重生成**——117 个 wikilinks，0 broken
7. **Slash commands**——/ingest 和 /vault-lint
8. **Graphify**——142 个节点，146 条边，29 个社区
9. **Lint 和清理**——修复 2 个断链 + 1 个 UTF-8 损坏

OpenClaw 的 308 个文件归档到 `archive/openclaw-raw/`，不影响日常使用。

## Graphify 发现

知识图谱发现了一些有趣的连接：

- **God Nodes**：终端工具栈概览（15 条边）和 Claude Code（14 条边）是连接最多的节点
- **跨域桥梁**：拉普拉斯算子 ↔ 反应扩散——VEX 数学和 Substance 程序纹理之间的意外桥梁
- **最大社区**：Claude Code 架构（21 个节点）、终端工具栈（19 个节点）、渲染与 Lookdev（17 个节点）、Mari 纹理流程（16 个节点）

## 之后

现在添加新笔记的流程：

```
/ingest <url 或内容>
```

Claude 自动判断领域和子目录，按模板创建笔记，补全 frontmatter，添加 wikilinks，需要时更新 HOME.md。

定期跑 `/vault-lint` 检查健康，`/graphify .` 更新知识图谱。

从 430 个文件的混乱到 117 个结构化笔记 + 完整的 Claude 集成，整个过程不到一小时。这就是让 AI 做它最擅长的事——簿记——的价值。
