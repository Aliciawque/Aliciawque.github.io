---
title: "教会 AI 角色「学技能」：Skill 系统 + 11 个原生工具"
date: 2026-04-06
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "zh"
translationSlug: "soulbound-skill-system"
excerpt: "角色能设闹钟了，但它不知道什么时候该主动提醒你吃饭。Tool Use 解决了「能不能做」，Skill 系统解决了「知不知道该做」。Markdown 行为模板 + 渐进式注入 + 角色自创技能，再加上 11 个 iOS 原生工具——日历、提醒事项、通讯录、健康、定位、相册全部打通。"
canvasRender: false
---

## 从「能做」到「会做」

上一篇讲了 Tool Use——角色终于能真正设闹钟、查任务了。但有个问题：它只会被动执行。

你说「提醒我喝水」，它设。你说「查一下日程」，它查。它从不主动做什么。

这不像一个有个性的 AI 伙伴，更像一个听话的 Siri。

真正的「会做」需要两样东西：**行为知识**（知道什么场景该做什么）和**系统能力**（能调用 iOS 原生功能）。今天一次性全做了。

## Skill：Markdown 行为模板

Skill 的本质很简单：一段 Markdown 文本，告诉角色在什么情境下、该用什么工具、做什么事。

```markdown
---
name: Meal Reminder
description: Remind user to eat at regular meal times
scope: character
triggers: meal, food, hungry, eat, lunch, dinner
capabilities: set_reminder, get_current_time
---

- When the user mentions being hungry or skipping meals, check the current time
- If it's near a meal time (11:30-13:00, 17:30-19:00), set a reminder
- Use a caring tone, don't lecture about nutrition
- If the user says they already ate, acknowledge and move on
```

YAML frontmatter 是元数据，Markdown body 是行为指令。用户永远不需要看到 YAML——编辑器用表单字段抽象掉了。

为什么是 Markdown 而不是 JSON schema？因为行为规则本质上是自然语言——「用关心的语气，不要说教」这种东西没法结构化。Markdown 对 LLM 友好，对用户也友好。

## 渐进式注入：不浪费 token

最重要的设计决策：skill 内容不是全部塞进 prompt 的。

一个角色可能有 10 个 skill，每个 300 token。全部注入就是 3000 token，对于 8K 上下文的本地模型来说太贵了。

三层渐进策略：

**Layer 1 — 摘要注入**。每个 skill 只花 20-30 token 写进 PHI（Post-History Instructions），告诉 LLM「你有这些技能可用」。这层永远在。

```
Available skills:
- Meal Reminder: Remind user to eat at regular meal times [triggers: meal, food, hungry]
- Study Helper: Help with study planning [triggers: study, exam, homework]

If a conversation topic matches a skill, use the activate_skill tool to load its full instructions.
```

**Layer 2 — 关键词自动激活**。用户说了「好饿」，`SkillManager.matchSkills()` 匹配到 `hungry` 关键词，自动把 Meal Reminder 的完整 body 注入当前请求。零额外延迟，不需要 LLM 决策。

**Layer 3 — 工具回退**。如果关键词没命中，但 LLM 从对话上下文判断应该用某个 skill，它可以主动调用 `activate_skill` 工具。readOnly 类型，走 needsFollowUp 路径，LLM 拿到完整指令后再回复。

这样大多数对话只消耗 Layer 1 的 20-30 token/skill。只有话题匹配时才加载完整内容。

## 角色自创技能

这是最有趣的部分。角色不只是使用 skill，还能创建它们。

`create_skill` 是一个 `requiresConfirmation` 的 writeAction 工具。对话中角色认为需要一个新行为模式时，它会提议创建：

> 用户：每天都忘记吃午饭，太忙了
> 角色：（调用 create_skill）我帮你建一个午餐提醒技能？
> [确认卡片：Create skill "Lunch Reminder"? ✓ ✗]

用户确认后，skill 文件写入 `Documents/Skills/{characterId}/`，索引更新到 UserDefaults。下次对话就生效了。

确认流程踩了个有意思的坑：`ToolRouter.currentCharacterId` 是静态变量，ChatService 在处理完响应后清除。但用户确认是异步的——等用户点击时，characterId 早就是 nil 了。修法是在进入 `needsConfirmation` 时保存 `pendingCharacterId`，确认时恢复。

## 四层开关

Skill 的启用有四层控制，从粗到细：

1. **系统总开关** — 一键禁用所有 skill
2. **单个 skill 开关** — 全局启用/禁用某个 skill
3. **角色覆盖** — 某个角色可以关掉一个全局 skill（比如「Sherlock 不需要学习助手」）
4. **角色专属 skill** — 只属于某个角色的 skill

存储上，全局 skill 在 `Documents/Skills/global/`，角色 skill 在 `Documents/Skills/{characterId}/`。覆盖关系存在 `SkillOverrides_{characterId}` 的 UserDefaults JSON 里。

UI 反映这四层：Settings → Skills 管全局，ChatView 菜单 → Skills 管角色级别（显示角色专属 + 全局覆盖开关）。

## 11 个原生 iOS 工具

Skill 知道「该做什么」，工具决定「能做什么」。这次一口气接了 6 个 iOS 框架：

| 框架 | 工具 | 类型 |
|------|------|------|
| EventKit | `read_calendar`, `create_calendar_event` | 读/写 |
| EventKit | `read_reminders`, `create_apple_reminder` | 读/写 |
| Contacts | `read_contacts` | 只读 |
| HealthKit | `read_health_steps`, `read_health_sleep`, `read_health_heart_rate` | 只读 |
| CoreLocation | `get_location` | 只读 |
| PhotosUI | `pick_photo`, `take_photo` | 交互式 |

每个框架一个 Bridge 文件，统一注册到 ToolRegistry。权限检查通过 `NativePermission` helper——权限被拒绝时工具返回友好错误，LLM 转述给用户。

HealthKit 比较特殊：它没有统一的「健康数据」权限，而是按数据类型分别授权（步数、睡眠、心率各自独立）。每个 health 工具在执行时单独请求对应类型的读取权限。

Location 用 `CLLocationManager` + reverse geocoding，返回的不是坐标而是「你在北京朝阳区」这样的自然语言描述。角色拿到后可以自然地说「哦你在朝阳区啊，附近有家不错的咖啡馆」。

## Bug 修复记

实现完发现四个 bug，都修了。

**编辑器 sheet 内容丢失**。SwiftUI 的 `sheet(isPresented:)` 有个经典陷阱：sheet 内容闭包在 presentation 时捕获 `@State`，但状态可能还没传播。用 `.id()` 试图强制刷新也不可靠。换成 `sheet(item:)` + Identifiable wrapper，数据直接封装在 item 里传给 sheet。还有个细节——编辑同一个 skill 时 item.id 不能复用 skill.id，否则 SwiftUI 认为是同一个 item 不重新呈现。用 `UUID()` 每次生成新 id。

**工具确认后无文本回复**。`create_skill` 是 `requiresConfirmation + writeAction`。LLM 只发了 tool_call 没附带文字，stripped text 为空。确认执行后 ToolActionCard 显示「Created skill: Meal Reminder」，但角色没说话——空白粉色气泡。加了 `generateToolFollowUp()` 方法：工具执行后自动触发一轮 LLM 调用，让角色自然地回应。Follow-up 响应还要经过 `ToolCallParser` 清理，因为 ContextEngine 在 system prompt 里注入了工具 schema，LLM 可能在 follow-up 里也生成 `<tool_call>` 标签。

**新对话第一句话消失**。ChatView 的 `.task` 只做 `loadMessages()`。「清空历史重新开始」会清除所有消息但不重建问候语。加了一行检测：messages 为空时自动调用 `createGreetingMessage()` 生成并保存。

## 数字

- 21 个新文件 + 6 个修改文件（Skill 系统 + Native Tools）
- 4 个 bug 发现并修复（sheet stale state、follow-up 空白、首条消息、工具标签泄漏）
- 11 个原生 iOS 工具，覆盖 6 个系统框架
- 三层渐进注入，空闲时每个 skill 只消耗 ~25 token
- 角色不再只会被动执行了——它开始有自己的「本能」
