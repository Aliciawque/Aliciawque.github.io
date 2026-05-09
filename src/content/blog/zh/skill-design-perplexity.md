---
title: "好的人类文档就是坏的 Skill：Perplexity 教我重写 Agent 知识库"
date: 2026-05-09
tags: ["Claude Code", "AI", "Skills", "经验分享"]
lang: "zh"
translationSlug: "skill-design-perplexity"
excerpt: "读了 Perplexity 的 Agent Skills 设计指南，发现自己的 skill 全在犯一个错：写成给人看的文档，不是给模型看的路由表。14 个 skill 全部审计重写，最大的一条砍了 150 行标准 API 文档。核心收获：description 不是说明书，gotchas 才是最高价值内容。"
canvasRender: false
---

## 起因

刷到 Perplexity 发了一篇 [Designing, Refining, and Maintaining Agent Skills](https://research.perplexity.ai/articles/designing-refining-and-maintaining-agent-skills-at-perplexity)。他们维护几百个 production skill，踩了无数坑，总结成一份指南。

读完发现自己踩的坑跟他们收到的大部分 PR 一样：**把 skill 当文档写，不把 skill 当上下文工程写。**

## 最反直觉的一条

> 好的人类文档 = 坏的 Skill 文档。

我之前写 gsap skill 的时候，老老实实列了完整的 API 表格：`gsap.to()`, `gsap.from()`, `gsap.fromTo()`，transform aliases 对照表，timeline position 参数，easing 列表……整整 212 行。

但模型**已经知道 GSAP**。它从训练数据里学会了。我写的东西对它来说是噪音，每个 token 都在稀释真正有用的信息。

Perplexity 的原文更狠：

> "If the implementation is easy to explain, it may be a good idea" — 这是 Python 之禅。"If it's easy to explain, the model already knows it. Delete it." — 这是 Skill 之禅。

## 六条硬规则

从文章里提炼出对我最有用的六条：

### 1. Description 是路由触发器

不是写 "This skill does X"。是写 "Load when user says X, Y, Z"。

我的 `graphify` 原来写的是 "any input → knowledge graph → clustered communities → HTML + JSON + audit report"。这是功能描述。

改成 "Load when user says /graphify, build a knowledge graph, visualize relationships, cluster documents"。这是路由指令。模型看到用户说 "帮我可视化这个代码库的关系"，就知道该加载这个 skill。

### 2. 每句话都要过税测试

> "Would the agent get this wrong without this instruction?"

不会？删。每个 token 在每次 session、每个用户身上都在付出代价。Perplexity 说他们的 skill index 层预算是每个 skill 约 100 tokens，因为**每个 session 每个 user 都在付这个成本**。

### 3. 不要写 model 已经知道的

标准 git 命令序列？删。CSS transform 属性对照表？删。GSAP API 文档？删。

只写训练数据里没有的东西：你的判断、品味、gotchas。

### 4. Gotchas 是最高价值内容

这对我震动最大。Perplexity 说 gotchas 随时间增长，是 append-mostly 的。每次 agent 失败就加一条。这些负面示例比正面指导更有价值，因为它们告诉模型**什么不要做**。

我之前几乎没有 skill 有 gotchas 段落。现在 13 个 skill 都有了。

### 5. Hub-and-spoke 结构

SKILL.md 是 hub，保持精简。重型内容拆到 `references/`、`scripts/`、`assets/`。

### 6. 不要 Railroad

不要写 "先执行命令 A，再执行命令 B，再执行命令 C"。给意图："Cherry-pick the commit onto a clean branch. Resolve conflicts preserving intent." 让模型自己决定怎么做。

## 审计结果

按这六条规则，我审计了全部 19 个自有 skill 和 3 个 command：

| 改动 | 数量 |
|---|---|
| Description 改为路由触发器 | 12 |
| 新增 Gotchas 段落 | 13 |
| 删除冗余/已知内容 | 5 |
| 结构优化 | 2 |

最大的单个改动是 gsap：从 212 行砍到 60 行。删除了所有标准 GSAP API 文档，只留 HyperFrames 上下文中非显而易见的模式和 gotchas。

## 印象最深的细节

Perplexity 提到一个发现：**LLM 自写 skill 无效**。

> "Self-generated Skills provide no benefit on average, showing that models cannot reliably author the procedural knowledge they benefit from consuming."

这意味着你需要往 skill 里注入你的**意见**。模型写不出它自己不知道的 gotchas。只有人类踩了坑才能写出来。

这跟 Emil Kowalski 说的 "Agents with Taste" 是一回事：可 transfer 的不是审美本身，是你 articulate why 的习惯。Skill 就是那个 articulation。

## 写入 CLAUDE.md

这六条规则已经写进全局 CLAUDE.md，作为建新 skill 时的硬约束。以后每次创建或审查 SKILL.md，都按这个清单检查。

同时写了一份 memory (`feedback_perplexity_skill_design.md`)，确保未来 session 也能读到这套规则。

## 代码之外

这件事让我重新理解了 "prompt engineering" 这个词。写 skill 不是在写代码文档，也不是在写 prompt。是在做**上下文工程**——在有限的 token 预算里，把最密的信号塞进模型能看到的最窄的管道里。

每个多余的词都在让所有其他 skill 变差。每个缺失的 gotcha 都在等待下一次失败。

Perplexity 的文章标题是 "Designing, Refining, and Maintaining Agent Skills"。Refining 和 Maintaining 才是关键词。Skill 不是一次写完的。是每次 agent 失败后长出来的。
