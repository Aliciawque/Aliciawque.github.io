---
title: "读完 16 章 Agent 教程，真正改变认知的只有三件事"
date: 2026-05-10
tags: ["AI", "Agent", "经验分享"]
lang: "zh"
translationSlug: "agent-fundamentals-hello-agents"
excerpt: "读了 Datawhale 的 Hello-Agents 教程，16 章从定义到实战。但我发现最有价值的不是 ReAct 怎么写、MCP 怎么接，而是三个认知盲区：上下文越多模型越蠢（Context Rot）、上下文不是塞进去的是筛选出来的（GSSC 流水线）、三个协议不在同一层（MCP/A2A/ANP 分工）。"
canvasRender: false
---

## 起因

Datawhale 出了一本 [Hello-Agents](https://github.com/datawhalechina/hello-agents)，16 章，从"什么是智能体"到"构建赛博小镇"。4 万 star。我花了两天读完，做了四篇笔记。

说实话，前四章（定义、历史、LLM 基础、经典范式）对经常折腾 Agent 的人偏基础。但从第九章开始，有几样东西真正修正了我脑子里的模型。

## 盲区一：上下文越多，模型越蠢

我一直以为上下文窗口是越大越好——128K 不够就等 1M。Hello-Agents 第九章给了这个名字：**Context Rot（上下文腐蚀）**。

原因不复杂：

- Transformer 的注意力是 $n^2$ 的。token 翻倍，每个 token 分到的注意力减半
- 位置编码在长序列里精度下降——模型分不清"第 5000 个 token"和"第 5001 个 token"
- 训练数据里长序列本来就少——模型没见过怎么在 10 万 token 里准确找到关键信息

这解释了我用 Claude Code 写长项目时的一个体感：**越到后面，Claude 越容易重复自己之前做过的事**。不是模型"忘了"，是信号被噪声稀释了。

这直接改变了我的策略。之前写 system prompt 时总觉得"多写点以防万一"。现在我开始问：**这条信息是不是每次都需要？** 如果不是，就别放在常驻上下文里。

## 盲区二：上下文不是塞进去的，是筛选出来的

教程里给出了一个叫 GSSC 的流水线：**Gather → Select → Structure → Compress**。

这不是一个抽象概念，是四步工程流程：

1. **Gather**：从系统指令、记忆、RAG、对话历史多源汇集。每个源 try-except，单源失败不影响整体
2. **Select**：给每个信息包打分。`score = 相关性权重 × 相关性 + 新近性权重 × 新近性`。贪心算法按分数填 token 预算
3. **Structure**：输出分区模板。`[Role & Policies]` `[Task]` `[Evidence]` `[Context]` `[Output]`。每块各司其职
4. **Compress**：超预算就压缩。保留结构性信息，丢弃冗余细节

我之前的做法更接近"把所有相关信息都塞进去"。GSSC 说的是**有预算的意识流**——token 是稀缺资源，每个 token 都在跟其他 token 竞争注意力。

这跟我之前学 Perplexity 的 Skill 设计原则完全一致：**每个多余的词都在让所有其他信息变差**。只是 Perplexity 说的是 Skill 层面，GSSC 说的是整个上下文窗口。

教程还提供了一个叫 NoteTool 的实践工具——让 Agent 把关键信息写到外部 Markdown 文件，而不是全记在上下文里。这本质上是给 Agent 一个外部硬盘，上下文当内存用。

## 盲区三：MCP、A2A、ANP 不在同一层

我之前看 MCP 和 A2A，总觉得是竞争关系——Anthropic 推一个，Google 推一个，谁赢？

教程把它们放在了不同层：

| 协议 | 解决的问题 | 类比 |
|------|-----------|------|
| MCP | Agent 怎么调用工具 | USB-C 接口标准 |
| A2A | Agent 之间怎么协作 | 手机之间的蓝牙 |
| ANP | 大量 Agent 怎么互相发现 | 互联网的 DNS |

**MCP 是 Agent 和工具之间的协议**。三层架构：Host（界面）→ Client（连接）→ Server（执行）。核心能力三个：Tools（主动执行）、Resources（被动提供数据）、Prompts（模板指导）。工作流是：工具发现 → 上下文构建 → 模型推理 → 工具执行 → 结果整合。

MCP 和 Function Calling 不是替代关系。FC 是模型内置能力（"会打电话"），MCP 是协议标准（"全球统一电话号码格式"）。二者互补。

**A2A 是 Agent 和 Agent 之间的协议**。P2P 网状拓扑，核心单元是 Task（任务）和 Artifact（工件）。任务生命周期：创建 → 协商 → 代理 → 执行 → 完成。跟中央协调器比，没有单点故障，没有性能瓶颈。

**ANP 是大规模网络的发现协议**。用 `.well-known/agent-descriptions` 做索引，DID 做身份验证。还在早期阶段。

实际选择很清晰：
- 需要接外部服务/工具 → MCP
- 多 Agent 协作 → A2A
- 大规模开放网络 → ANP（暂观望）

三层可以共存。

## 范式选择的心智模型

教程对三大经典范式的对比也帮我理清了思路：

- **ReAct**（推理+行动交织）— 适合探索性任务，需要边想边查
- **Plan-and-Solve**（先规划后执行）— 适合结构性强、路径确定的任务
- **Reflection**（执行→反思→优化）— 适合质量要求极高、时间不紧的任务

这不是"哪个更好"的选择题，是**根据任务特征选工具**的决策表。实际项目中往往混合使用：先用 Plan-and-Solve 生成计划，每步用 ReAct 执行，关键步骤用 Reflection 校验。

我之前做 Soulbound 的 Agent 系统时，其实已经在用类似的东西——只是没有这套清晰的命名。现在有了名字，下次遇到就能更快匹配。

## 实际影响

读完之后我做了三件事：

1. 精简了所有 system prompt——每句话都过"删了模型会不会搞错"的税测试
2. 给长时程任务加了 NoteTool 式的外部笔记——关键决策写到文件，不靠上下文记忆
3. 把 MCP/A2A/ANP 的分层模型记在笔记里，下次架构决策时先定位是哪一层的问题

16 章教程，值得精读的是第四、九、十章。其余的按需跳读就好。

## 相关笔记

完整的学习笔记在 Obsidian vault 里：

- **智能体基础总览** — Agent 四要素、PEAS 模型、Agent Loop
- **Agent 经典范式** — ReAct / Plan-and-Solve / Reflection 对比
- **上下文工程** — Context Rot、GSSC 流水线、NoteTool
- **Agent 通信协议** — MCP / A2A / ANP 分层对比
