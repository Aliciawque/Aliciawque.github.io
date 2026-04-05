---
title: "修了 10 个 bug 才让角色学会「主动找你说话」"
date: 2026-04-05
tags: ["iOS", "SwiftUI", "AI", "Debugging"]
lang: "zh"
translationSlug: "soulbound-proactive-messaging-bugs"
excerpt: "角色调错工具、通知被自己清掉、LLM 把提醒内容当对话模仿、工具闭包里直接调通知 API 静默失败……一天修了 10 个 bug，记录每个坑的根因和修法。"
canvasRender: false
---

## 背景

Soulbound 是我在做的 iOS AI 角色陪伴 app。上一轮实现了「主动消息」系统——角色可以在设定的时间给你发消息（早安、晚安、自定义提醒），通过本地通知推送。

核心功能跑通了，但自定义消息部分有一堆 bug。今天花了一整天集中修，修了 10 个，踩了不少坑，值得记录。

## Bug 1：角色调错工具

**现象**：用户说「提醒我喝水」，角色调了 `set_reminder`（一次性延迟提醒）而不是 `set_proactive_reminder`（周期自定义任务）。

**原因**：两个工具描述太相似。LLM 看到 "reminder" 就选了参数更简单的那个。

**修法**：改描述。`set_reminder` 标注 "NOT recurring"，`set_proactive_reminder` 标注 "recurring daily/hourly/weekly"。

**教训**：prompt-based tool calling 下，工具描述就是 LLM 的选择依据。描述要简短，区分要明确。

## Bug 2：自定义消息显示原始提示词

**现象**：通知内容是 "Say hi to me"（原始 promptHint），不是角色风格的 LLM 生成内容。

**原因**：`preGenerateCache()` 只为 `.daily` 类型的自定义项生成 LLM 缓存。`.interval` 和 `.weekdays` 类型被跳过了，fallback 到原始 promptHint。

**修法**：移除 `if case .daily` 限制，所有 schedule 类型都预生成。

## Bug 3：自定义项不可编辑

**现象**：Custom Messages 列表里的项目点击无反应。

**修法**：加 `onTapGesture` → 编辑 sheet。但这里有个坑——

### 子坑：onTapGesture 吞掉 Toggle

最初把 `.onTapGesture` 加在整行上，结果 Toggle 也被拦截了，点 Toggle 变成打开编辑器。修法是把 tap 只加在标题行（上半 HStack），Toggle 所在的下半行不受影响。

## Bug 4：通知 ID 前缀冲突

**现象**：`set_reminder` 创建的提醒通知不触发。

**原因**：`scheduleAllNotifications()` 在 app 激活时清除所有 `proactive-` 开头的 pending 通知。我们的 `set_reminder` 通知 ID 用了 `proactive-reminder-{uuid}`——被自己家的清理逻辑误杀了。

**修法**：改前缀为 `tool-reminder-`。

**教训**：通知 ID 的命名空间要规划好。清理逻辑用前缀匹配时，其他模块不能用相同前缀。

## Bug 5：工具闭包里直接调通知 API 静默失败

**现象**：`set_reminder` 的 execute 闭包里直接调 `UNUserNotificationCenter.current().add(request)` 成功返回但通知不触发。

**原因**：工具 execute 闭包运行在 async 上下文。直接获取 `UNUserNotificationCenter.current()` 可能拿到的实例跟 `NotificationService` 单例持有的不一样，或者 delegate 没设置。

**修法**：改回用 `NotificationService.shared.scheduleNotification()`。这个单例在主线程初始化，delegate 正确设置，通知可靠触发。

**教训**：iOS 通知 API 虽然标称线程安全，但在实际工具闭包执行环境里，走单例更可靠。这个 bug 最难查——没有任何错误日志，通知就是不出来。

## Bug 6：LLM 模仿主动消息内容

**现象**：用户说「提醒我睡觉」，角色回复最后莫名其妙带上了 "Say hi to me"。

**原因**：主动消息（如 "Say hi to me"）作为 assistant message 存入聊天数据库。构建 LLM 上下文时，这些消息被当作对话历史传给 LLM。DeepSeek 看到这些内容就当作对话模式来模仿。

**修法**：在 ChatService 所有构建上下文的 `getMessages` 调用后加 `.filter { $0.metadata?["source"] != "proactive" }`。主动消息在聊天 UI 里仍然可见，但不参与 LLM 推理。

**教训**：任何非对话内容存入聊天记录时，必须考虑它会不会被 LLM 读到。用 metadata 标记 + 查询时过滤是个好模式。

## Bug 7：enableChatMemory 路径缺失工具 schema

**现象**：有时候工具完全不被调用。

**原因**：ChatService 有三条构建上下文的路径：ContextEngine / ChatMemorySystem / Legacy。只有 ContextEngine 路径注入了工具 schema。如果走了 ChatMemorySystem 路径，LLM 根本看不到工具定义。

**修法**：在后两条路径也注入 `toolRouter.registry.schemaForPromptInjection()`。

## Bug 8：工具描述太长导致 prompt-based 调用失败

**现象**：改了工具描述后，DeepSeek 不再调用任何工具。

**原因**：DeepSeek 在 streaming 模式下只支持 prompt-based tool calling（`<tool_call>` 标签）。把工具描述从一行改成多行详细说明后，LLM 被长文本干扰，不再生成 tool_call 标签。

**修法**：描述保持一行，格式恢复原始模板（两个 example、"EXACTLY this format" 关键词）。

**教训**：prompt-based tool calling 对格式极度敏感。改动前后要测试，不能假设"更详细=更好"。

## Bug 9：writeAction displayText 直接暴露给用户

**现象**：当 LLM 只生成 tool call 没有文本时，用户看到的是原始的 `"Set a one-time reminder for 1 minutes from now: 刷牙. Note: this is a one-time reminder..."` 英文技术文本。

**原因**：`writeAction` 的 `displayText` 在 LLM 无文本时作为 fallback 直接展示。我们在里面放了给 LLM 看的指引。

**修法**：改 `set_reminder` 为 `readOnly` 类型，这样工具结果会回传 LLM 生成自然语言回复。displayText 保持简洁。

## Bug 10：硬编码缓存 key 前缀

**现象**：AppCoordinator 里的 `set_proactive_reminder` 工具直接写死了 `"proactive-cache-"` 前缀来存缓存。

**原因**：这个前缀跟 `ProactiveMessagingService` 的 `cacheKeyPrefix` 一致只是巧合。如果后者改了，缓存就会断。

**修法**：加了 `ProactiveMessagingService.writeCache()` 公开方法，统一管理缓存 key。

## 总结

10 个 bug，大致分三类：

1. **命名空间冲突**（Bug 4, 10）——不同模块用了相同的前缀/key 格式
2. **LLM 上下文污染**（Bug 1, 2, 6, 7, 8）——放进 prompt 的内容会直接影响 LLM 行为
3. **iOS 运行环境差异**（Bug 5, 9）——API 文档说线程安全 ≠ 所有上下文都能用

最难查的是 Bug 5（静默失败无日志）和 Bug 6（需要理解 LLM 为什么模仿特定内容）。最好修的是 Bug 3（纯 UI 改动）。

这些 bug 都不算"难"，但它们交织在一起——修一个可能暴露另一个，或者引入新的。关键是每修一个就审查一次，不要攒着一起测。
