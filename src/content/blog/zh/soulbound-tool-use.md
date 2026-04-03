---
title: "让 AI 角色真正「做事」：Tool Use 系统设计与实现"
date: 2026-04-03
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "zh"
translationSlug: "soulbound-tool-use"
excerpt: "角色说「好的我帮你设个闹钟」，然后什么都没发生。这种体验终于结束了。我给 Soulbound 加了一套双轨 Tool Use 系统，让 LLM 角色能真正调用 iOS 通知、任务管理和时间查询——支持 OpenAI、Anthropic、Gemini 原生 API，也能回退到纯提示词模式兼容国产模型。"
canvasRender: false
---

## 痛点

用 Soulbound 和角色聊天，你说「三小时后提醒我喝水」，角色会认真回复「好的，我已经帮你设好了提醒哦~」。

但它在说谎。什么都没发生。手机不会在三小时后响。

这不是 LLM 的问题——它理解了你的意图，也给出了合理的回应。问题在于 app 没有连接层：LLM 的输出是纯文本，和 iOS 的通知、任务、日历之间隔着一道墙。

今天把这道墙拆了。

## 双轨协议：从"说"到"做"

最难的决策不是"要不要做 Tool Use"，而是"用什么协议"。

OpenAI 和 Anthropic 都有原生的 function calling / tool use API——结构化输出，可靠性高。但 Soulbound 的用户群里有大量接国产模型的人（Kimi、GLM、MiniMax、豆包），这些模型的 function calling 支持参差不齐。

最终选了双轨方案：

**原生路径**：OpenAI/Anthropic/Gemini 各用自己的 `tools` 参数，LLM 返回结构化的 `tool_calls` 字段，解析稳定。

**Prompt-based 回退**：对不支持原生 API 的模型，把工具定义注入到 system prompt 里，让 LLM 在回复中用 `<tool_call>{"name":"...","arguments":{...}}</tool_call>` 标签表达意图，用正则解析。

`APIConfiguration.toolUseMode` 控制切换：`.auto` 模式下 OpenAI/Anthropic/Gemini/DeepSeek 走原生，`.custom` 走 prompt-based。用户也可以手动覆盖。

## 三层架构

整个系统拆成三个独立组件，不侵入现有的 ChatService：

```
ChatService.sendMessage()
    ↓
    LLMService.chatWithTools()  ← 注入 tool schemas
    ↓
    ToolRouter.process()        ← 解析 + 执行 + 路由
    ↓
    ToolCallParser.parse()      ← 双轨解析
    ToolRegistry.execute()      ← 查找 + 执行
```

**ToolRegistry** 是注册中心。App 启动时声明式注册 7 个工具，每个工具带 name、参数 schema、执行闭包。它能生成四种格式的 schema（OpenAI/Anthropic/Gemini JSON + prompt 文本）。后续加 MCP 只需 `registry.register()`。

**ToolCallParser** 是双轨解析器。输入是 LLM 的原始响应 + 可选的 native tool_calls JSON。有 native 就用 native（还会清理响应文本中可能残留的 `<tool_call>` 标签），没有就正则扫描。解析失败？整个响应当纯文本处理，永远不丢失角色的回复。

**ToolRouter** 是协调层。拿到解析结果后：
- 纯文本 → 原样返回
- writeAction（设提醒、创建任务）→ 立即执行，把确认文案拼进回复
- readOnly（查任务、查时间）→ 执行后把结果注入上下文，**再调一次 LLM**，让角色用自然语言说出结果
- 需要确认 → 返回 pending，UI 弹确认卡片

readOnly 回流是关键设计。用户问「今天有什么任务」，角色不是机械地列一个表格——它拿到任务列表后，用自己的语气说「你今天有三件事哦，下午两点的会议别忘了~」。多一次 API 调用，但角色感不断裂。

## 7 个内置工具

| 工具 | 类型 | 做什么 |
|------|------|--------|
| `set_reminder` | writeAction | 调 NotificationService 设定时通知 |
| `send_notification` | writeAction | 立即发一条本地通知 |
| `create_task` | writeAction | 创建 TodoTask，支持 ISO8601 时间 |
| `complete_task` | writeAction | 模糊匹配标题，标记完成 |
| `list_tasks` | readOnly | 按 today/incomplete/all 过滤 |
| `get_current_time` | readOnly | 返回当前日期时间 |
| `get_today_tasks` | readOnly | 今日任务摘要 |

`complete_task` 用模糊匹配而不是 ID——因为 LLM 不知道任务的 UUID，但它知道用户说的任务名。`lowercased().contains()` 足够用了。

## 踩过的坑

**`@Published` 的线程安全**。`ChatService` 不在 `@MainActor` 上，但 `pendingToolCalls` 是 `@Published`。async 函数里直接赋值会触发 Swift 6 的 data race 警告。解决：赋值处包裹 `await MainActor.run {}`，confirm/reject 方法标 `@MainActor`。

**Anthropic 的 system role 陷阱**。follow-up 消息最初用 `.system` role 注入工具结果——在 Anthropic 路径下，所有 system 消息会被提取拼接到顶层 `system` 字段，而不是留在 messages 列表里。等于把工具结果当成了系统指令。改成 `.user` role + `[Tool Results]` 前缀。

**SwiftUI 不自动观察 `@Published`**。ChatView 里直接 `if let chatService = coordinator.chatService as? ChatService, let pending = chatService.pendingToolCalls` —— 写在 body 里并不会让 SwiftUI 订阅这个变化。因为 ChatService 不是 View 的 `@ObservedObject`。解决：用 `onReceive(chatService.$pendingToolCalls)` 驱动一个 `@State` 变量。

**Gemini tool_calls 格式**。Gemini 的 `functionCall` 在 parts 数组的元素里，解析时需要外层包一个 `["functionCall": fc]` 才能和 ToolCallParser 的 Gemini 分支匹配。少包一层，所有 Gemini 工具调用静默丢失。

**流式路径的限制**。`chatStream` 返回的是纯文本 chunk 流，没有结构化的 tool_calls 字段。所以流式模式只能用 prompt-based 解析（累积完整响应后扫描标签）。Native tool use 需要走非流式路径。这是有意的设计限制——第一期不做流式中途检测。

## Context Engine 集成

Tool schema 的注入复用了已有的 ContextEngine 7 层 prompt 组装架构。在 worldInfo 层和 PHI 层之间插了一个 [5.5] 层：

```
[1] Identity Anchor
[2] Character Card
[3] Assertion Summary
[4] Active Memories
[5] World Info
[5.5] Tool Schema ← 新增，prompt-based 模式才注入
[6] Chat History
[7] PHI
```

只有 `toolUseMode == .promptBased` 或 `.auto` + `.custom` provider 时才注入。原生路径的 schema 直接通过 LLMService 的 `tools` 参数传给 API，不占 prompt token。

## UI：透明但不打扰

两个新 UI 组件，跟现有聊天界面风格统一：

**ToolActionCard** — AI 气泡下方的紧凑卡片，显示执行结果。checkmark 图标 + 一行文字，可点击收起。左对齐（AI 侧），用 `theme.primary.opacity(0.08)` 背景，和 WorldInfoInjectionCard 视觉风格一致。

**ToolConfirmationCard** — 高风险操作的确认卡片。当前 7 个工具都不需要确认（未来的 delete_task 会需要），但组件已经做好了。Cancel/Confirm 两个按钮，pending 时 send 按钮自动禁用。

readOnly 查询（查时间、查任务）对用户完全透明——看不到工具调用的痕迹，只看到角色稍微停顿了一下然后自然地回答。

## 数字

- 12 个文件（6 新建 + 6 修改）
- 20 个单元测试（ToolRegistry 7 + ToolCallParser 7 + ToolRouter 6）
- 两轮代码审查修复了 39 项问题（Context Engine 23 + Tool Use 16）
- 支持 5 种 provider（OpenAI, Anthropic, Gemini, DeepSeek, Custom）
- 角色终于不再说谎了
