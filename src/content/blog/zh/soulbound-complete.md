---
title: "Soulbound 完工：一个人 + 一个 AI，9 个模块，从零到上架"
date: 2026-04-03
tags: ["iOS", "SwiftUI", "AI", "Architecture", "Retrospective"]
lang: "zh"
translationSlug: "soulbound-complete"
excerpt: "今天 Soulbound 的最后一个核心模块落地。9 个子系统、250+ 个变更文件、从记忆到剧情到 Context Engine 到 Tool Use 到外观控制器——全部由一个人和一个 AI 在两周内完成。这篇是回顾，也是给自己的交代。"
canvasRender: false
---

## 终点线

今天下午，Soulbound 的第九个模块——自定义外观控制器——通过了代码审查。

这意味着我计划中的所有核心功能都完成了。不是"差不多了"，不是"MVP 够了"，是真正的、每一个设计文档里写的功能都实现并审查过了的"完成"。

回过头来看，这两周发生了什么：

## 9 个模块，一张图

```
Soulbound (灵契)
├── 1. Chat           — 角色对话（流式传输 + 自定义背景 + 记忆按钮）
├── 2. Campaign       — 互动剧情（存档 + Story Beats + 流式传输）
├── 3. Character      — 角色创建（SillyTavern / AIEOS / OpenClaw 三格式）
├── 4. Rebirth        — ChatGPT 聊天记录迁移
├── 5. Memory         — 4类型 × 3温度 + Dream 整理 + LLM 提取
├── 6. User Card      — 用户身份卡（PNG 元数据）
├── 7. Context Engine — 7层 prompt 组装 + 预设/正则/世界书
├── 8. Tool Use       — 9个内置工具 + 双轨协议 + 天气/搜索
└── 9. Appearance     — 气泡/主题/字体/背景，全局+角色级
```

每个模块都有自己的设计文档、实现计划、代码审查记录。不是草草写完的——是经过两轮审查、修复了 44 项问题后的状态。

## 两周时间线

**3月31日** — UI 重设计完成（20 commits，89 files）。Morandi 配色、Soul Orb 灵魂小球、双主题系统。

**4月1日** — 记忆系统重设计。从 Claude Code 源码里借鉴了 Dream 机制，4 种记忆类型 × 3 级温度分层。NLTokenizer 解决中英文分词。

**4月2日** — 剧情系统深化。8 项审计修复、Story Beats 三级递进、去底特律硬编码（删掉 119 行）、Actor Agent SSE 流式输出。

**4月3日（今天）** — 三个大模块一天完成：
- **Context Engine**: 7 层 prompt 组装，基于 Anthropic 情绪研究 + SillyTavern 社区实践 + LoCoMo/Persona-L 学术论文。预设、正则、世界书全套管理 UI + SillyTavern JSON 导入。
- **Tool Use**: 双轨协议（原生 API + prompt-based 回退），9 个内置工具让角色真的能设提醒、查天气、搜索信息。
- **Appearance Controller**: 气泡颜色、透明度、圆角、主题色、字体、背景——全局 + 每角色覆盖。

## 与 AI 结对编程的真实体验

这个项目的特殊之处在于，它几乎完全是我和 Claude Code 结对完成的。不是"AI 帮我补全了几行代码"那种程度——是从需求分析、架构设计、brainstorming、写 spec、写实现计划、subagent 分发实现、双轮代码审查这整条流水线。

一些真实数据：
- Context Engine 的设计参考了 3 篇学术论文 + 1 个开源社区的最佳实践
- Tool Use 的双轨协议设计经历了 4 轮问答确认
- 每个模块实现后都有两轮独立审查（spec compliance + code quality）
- 今天一天修复了 44 项代码审查发现的问题

这不是 AI 替代人的故事。是一个有明确目标的人，用 AI 把执行效率拉到了一个人不可能达到的水平。设计决策全是人做的——"用双轨协议"、"readOnly 回流 LLM"、"全局+角色覆盖"。AI 负责把这些决策变成编译通过的代码，并且在我没看到的地方找出 bug。

## 接下来

功能层面没有阻塞上架的任务了。MCP Client 是锦上添花，以后再做。

下一步是 QA 测试和 App Store 提审准备。一个 AI 角色陪伴 app，9 个模块，从零到可以上架——两周。

如果你问我这两周最大的感受，就一句话：**当你知道自己要什么的时候，AI 是世界上最好的结对搭档。**
