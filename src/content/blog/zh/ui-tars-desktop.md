---
title: "让 AI 像人一样操作电脑：UI-TARS Desktop 拆解"
date: 2026-05-12
tags: ["AI Agent", "VLM", "GUI Agent", "架构", "ByteDance"]
lang: "zh"
translationSlug: "ui-tars-desktop"
excerpt: "刷到字节开源的 UI-TARS Desktop，一个让 AI 直接看屏幕操作电脑的 agent 全栈项目。Event Stream 当协议用、两个方法抽象所有设备、坐标归一化三层变换——架构设计比论文更值得读。"
canvasRender: false
---

## 起因

刷到字节跳动开源的 [UI-TARS Desktop](https://github.com/bytedance/UI-TARS-desktop)，star 数 13k+。原本以为是又一个 computer use demo，clone 下来读了两天源码——架构比论文有意思。

一句话概括：让 AI 像人一样操作电脑。不读 DOM，不走 Accessibility Tree，纯看截图理解界面，输出点击/输入/拖拽操作。

## 它到底在做什么

传统 GUI 自动化（Selenium、RPA）靠选择器定位元素，页面一改就挂。UI-TARS 换了个思路——截一张屏，扔给视觉语言模型（VLM），模型告诉你"点 (350, 200)"。

循环很简单：

```
截屏 → VLM 理解 → "Thought: 需要点设置按钮  Action: click(350,200)" → 执行 → 再截屏
```

这个 perceive-reason-act 循环和 [[Agent 经典范式|ReAct]] 是同一个范式，只是输入从文本变成了截图。难的不是模型本身，是让整个工程系统稳定运转。

## 三个架构精华

读完源码，有三个设计让我停下来了。

### Event Stream 不是日志，是协议

这是整个项目最核心的架构决策。

所有 agent 事件（消息、工具调用、思考状态）流经一个统一事件流。每个事件有 ID + 时间戳，缓冲区上限 1000 条，满了自动裁剪最旧的。看起来像日志系统？不是。

它**同时驱动两个子系统**：Context Engineering 决定给 LLM 喂什么上下文，Agent UI 决定渲染什么给用户看。CLI、Web UI、Desktop 三种前端共享同一套事件协议。

这意味着 agent 的内部状态和前端展示完全解耦。同一个 agent 内核，既能在终端里跑，也能在 Electron 窗口里跑，也能当 Web 服务跑。

我最近在研究 [[上下文工程]]，这个 Event Stream 就是上下文工程在 agent 系统里的工程实践——不是管理 prompt，是用协议驱动整个状态流转。

### Operator 两方法抽象所有设备

`Operator` 基类只有两个方法：`screenshot()` 和 `execute()`。

四种实现：nut-js 控制本地鼠标键盘、Playwright 控制浏览器、ADB 控制安卓、沙箱隔离环境。每个 Operator 还有一个静态属性 `ACTION_SPACES`，告诉系统"我支持哪些动作"。

系统 prompt 根据这个属性动态生成动作空间。新设备只需要实现两个方法，其他代码一行不改。

好的抽象就是这样——你一看就知道为什么是这两个方法而不是三个。截屏获取感知，执行产生动作，刚好覆盖了 agent 与环境交互的全部需求。

### 坐标归一化 Pipeline

这是视觉 agent 最容易出 bug 的地方，UI-TARS 处理得非常精细。

VLM 输出的坐标不是屏幕像素，是相对于 1000×1000 虚拟画布的归一化值。执行时需要三层变换：

1. VLM 输出虚拟坐标（如 `(350, 200)` 在 1000×1000 画布上）
2. 解析后转为 [0, 1] 浮点数（0.35, 0.2）
3. 反归一化为物理像素：`physical_x = round(0.35 × 1920 × 2.0)` （含 Retina DPR 补偿）

为什么这么麻烦？因为 VLM 不应该关心你的屏幕分辨率是多少。归一化把视觉推理和物理执行彻底解耦。

更细节的是，不同模型的坐标格式不一样——V1.0 用 box 坐标，V1.5 用 point，Doubao 用 bbox。项目为每个模型维护独立的 system prompt 版本。这是多模型 agent 系统的隐藏工程成本：模型能力差异不只影响推理质量，还影响 prompt 结构。

## Tarko：21 个包的元框架

项目底层的 Tarko 框架拆了 21 个独立包：agent-core、mcp-agent、context-engineer、agent-ui、model-provider、agent-snapshot……

这种拆法值得参考。大型 agent 框架最怕的是"上帝类"——一个 Agent 类塞了工具注册、模型调用、上下文管理、UI 渲染所有逻辑。Tarko 把每个关注点拆成独立包，通过 Event Stream 连接。

MCP 集成也值得说一句：不是"支持 MCP"，是**内核构建在 MCP 之上**。MCPClient 统一抽象四种传输（stdio / SSE / streamable-http / in-memory），内置沙箱文件系统（目录白名单 + symlink 解析防 traversal），支持 allow/block glob 过滤工具。

## 模型本身

UI-TARS 基于 Qwen2.5-VL 架构，有两个规模——7B（消费级 GPU 可跑）和 72B。一个有趣的设计：推理温度默认 0，top_p 默认 0.7。为什么？因为视觉定位（grounding）任务需要坐标输出的确定性，低温度保证点得准。

ScreenSpotPro 基准 61.6%，对比 Claude 27.7%、OpenAI CUA 23.4%。游戏场景更强——Poki 测试 13/14 满分。游戏能力为什么重要？因为游戏界面没有标准化的 DOM 结构，纯靠视觉理解，这恰好是 VLM agent 最该擅长的场景。

UI-TARS-2 引入了 Multi-Turn RL——不是优化单步动作，而是优化整个任务轨迹。还有一个有意思的发现：Inference-time Scaling，交互越多模型越聪明。在 Minecraft 和 Poki 里尤其明显。

## 和 Claude Computer Use / OpenAI CUA 比

| 维度 | UI-TARS Desktop | Claude Computer Use | OpenAI CUA |
|---|---|---|---|
| 开源 | Apache 2.0 | 仅 API | 仅 API |
| 本地部署 | 支持（需 GPU） | 不支持 | 不支持 |
| 设备覆盖 | 桌面 + 浏览器 + 安卓 | 桌面 + 浏览器 | 仅浏览器 |
| MCP 集成 | 原生 | 有限 | 无 |
| 非标 GUI | 极强 | 中等 | 中等 |

开源 + 可本地部署 + 安卓支持，这是它独有的一排。

弱项也很明显：视觉浏览器控制目前只支持 VolcEngine 的 Doubao 模型，计算资源需求大，文档承认存在幻觉问题。

## 真正带走的东西

读完 UI-TARS Desktop，带走的不是某个具体实现，是三个架构判断：

**事件流应该是协议，不是管道。** 日志系统是你想看的时候去翻的东西，协议是驱动整个系统运转的东西。当 agent 需要同时服务 CLI、Web、Desktop 三种前端时，Event Stream 是比回调更干净的解法。

**好的抽象方法数等于环境交互维度。** Operator 只需要两个方法，因为 agent 和环境的交互只有两种——感知（截图）和行动（执行）。多一个都是过度设计。

**视觉 agent 的工程难点不在模型，在坐标系。** 模型能力在快速提升，但坐标归一化、DPR 补偿、多模型 prompt 版本管理这些工程细节，才是决定系统能不能稳定运行的关键。

项目还在快速迭代，Tarko 框架的 21 包拆分值得持续关注——它在试图定义一个 agent 框架的标准模块边界。
