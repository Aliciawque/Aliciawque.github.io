---
title: "一天重写半个 App：Soulbound 剧情引擎和记忆系统大修"
date: 2026-04-02
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "zh"
translationSlug: "soulbound-campaign-overhaul"
excerpt: "8 个 bug 修复、一套 Story Beats 节奏系统、200 行硬编码删除、记忆系统双轨合一、中文分词支持、Actor 流式输出——一天之内，Soulbound 的剧情引擎和记忆系统几乎被重写了一遍。这篇是流水账式的开发记录。"
canvasRender: false
---

## 起因

Soulbound 的剧情模式（Campaign）是整个 app 最复杂的模块。DM Agent 生成叙事，MVU 引擎管理状态变量，存档系统支持回退和分叉，结局收集器追踪多周目进度。

但一直没认真审计过。上周完成了 UI 重设计和记忆系统重写之后，我决定趁热打铁，把剧情引擎也过一遍。

结果一审就停不下来了。

## 第一轮：审计和修复

我让 Claude 对整个剧情系统做全面审计——存档、回退、分叉、变量控制。它翻了十几个文件，列出了 4 个严重问题和 6 个重要问题。

严重的几个：

**Story Beats 永远不会自动完成。** `StoryBeatTracker` 有 nudge（3 轮提醒）和 hint（6 轮暗示），但缺少 autoComplete 阈值。玩家如果就是不完成目标，系统会一直卡在 hint 循环里。修复：加了 9 轮自动完成门槛。

**SET 操作可以任意赋值。** `CampaignGameEngine` 对 ADD/SUBTRACT 有 ±10 的限制，但 SET 操作没有上限。LLM 可以直接 `SET trust 100` 跳过整个关系构建过程。修复：SET 操作加了 ±20 的摆幅限制——比增减操作更宽松，但不会一步到位。

**Undo 系统无法正确回退 SET。** 旧的 undo 实现是手动计算反向变更——`ADD 5` 就 `SUBTRACT 5`。但 SET 操作不可逆：`SET trust 80` 之前是多少？不知道。修复：换成 MVU 快照恢复，直接回到上一个状态快照，SET 也能正确回退。

**EndingCollectionManager 没有按剧本隔离。** 所有剧本共享同一个 `unlocked_endings` 键，意味着 A 剧本解锁的结局会在 B 剧本里显示。修复：存储键改为 `campaign_unlocked_endings_{campaignId}`。

另外还清理了 SavePoint 里 44 行死代码、加了 `scenePhase .background` 自动存档。

一次提交，10 个文件，净删 229 行。

## 第二轮：去底特律

这是积压最久的技术债。

Soulbound 最早是为一个底特律主题的互动故事做的原型。`CampaignState` 里硬编码了 12 个变量——`connorAffection`、`deviancyLevel`、`trustLevel`、`hanksOpinion`、`storyBranch`……连一个 `StoryBranch` 枚举都有（`machine / neutral / deviant`）。

`MVUEngine` 有 200 行 switch 语句处理这些字段。`ConditionEvaluator` 有 `storyBranch` 特判。`CampaignMemoryExporter` 有底特律专属的导出逻辑。

全部改成了通用架构：

- `CampaignState` 只保留 `currentChapter: Int`，所有其他变量进 `dynamicVariables: [String: Int]`
- `MVUEngine` 删掉 switch，统一走 `state.apply()`，变量范围从 definition bounds 里读
- `ConditionEvaluator` 用通用的 string-to-int 映射替代 `storyBranch` 特判
- 自定义 `Codable` 解码器自动迁移旧存档——检测到旧字段就搬进 `dynamicVariables`

12 个文件，净删 119 行。任何类型的剧本都能跑了，不再假设世界里有仿生人。

## 第三轮：Story Beats

剧情模式有一个核心问题：LLM 不知道故事该往哪走。

DM Agent 能生成精彩的即兴叙事，但没有方向感。玩家可能在酒吧聊了 20 轮天都没推进剧情，因为 DM 不知道"这章的目标是什么"。

Story Beats 就是给 DM 的路标：

```
Chapter 1, Beat 1: "Player discovers the anomaly in the lab"
Chapter 1, Beat 2: "Player decides whether to report or investigate alone"
```

每个 Beat 有触发条件和完成判定。`StoryBeatTracker` 追踪每个 Beat 的回合数，三级递进：

- **3 轮**：DM prompt 里注入 nudge（"subtly guide the player toward..."）
- **6 轮**：升级为 hint（"strongly hint at..."）
- **9 轮**：autoComplete，强制完成并推进

DM 在 JSON 响应里返回 `beat_completed: true` 表示目标达成。章节转换被门控在必需的 Beats 上——所有必需 Beat 完成才能切章。

剧情卡创建时，LLM 自动为每章生成 2-3 个 Beats。

8 次提交，9 个文件，+637 行。

## 第四轮：记忆系统合并

上周刚重写了记忆系统（CharacterMemory），但旧系统（ChatCoreMemory）还在并行运行。两套提取器都在跑，两套注入路径都往 prompt 里塞数据。浪费 token，还可能产生矛盾。

这次彻底合并了：

- `ChatMemorySystem.onSessionStart` 自动迁移旧数据——名字、职业、兴趣、偏好、关系值（affection/trust/familiarity）全部转成 CharacterMemory 条目
- 移除双重注入路径（不再调 `ChatMemoryInjector.buildCoreMemoryContext()`）
- 移除双重提取路径（不再调 `ChatMemoryAutoExtractor.recordMessage()`）
- `ChatUserCardIntegration` 改为直接写入 CharacterMemory

关系值没有在 UI 上显示，所以可以放心地从数字转成描述文字。`"Affection: Close (75/100), Trust: Full Trust (85/100)"` 作为 relationship 类型的记忆条目，always-inject 机制保证每次对话都能看到。

顺手修了一个一直存在的 bug：`MemoryRetriever.extractKeywords()` 用 `CharacterSet.alphanumerics.inverted` 分词，中文字符全部被当作分隔符丢掉了。换成了 Apple 的 `NLTokenizer`，中日韩英文都能正确分词。

最后把 Dream 整理（记忆降温、去重、清理）接入了 `DailyExportScheduler` 的夜间 BGAppRefreshTask——不用等用户主动退出 app 才触发了。

## 第五轮：Actor 流式输出

Soulbound 的剧情模式有一个 Duo 模式——DM 负责叙事，一个 AI 角色负责对话。DM Agent 已经有流式输出（打字机效果），但 Actor Agent 一直是等全部生成完才显示。

加了流式输出：

- `ActorAgentService` 新增 `generateResponseStreaming()` + SSE 解析（Anthropic 和 OpenAI 两条路径）
- `CampaignViewModel` 加 `@Published streamingActorResponse`，duo 模式自动走流式路径
- `CampaignModeView` 加 Actor 流式气泡 + 自动滚动

Actor 的输出是纯文本（第一人称对话 + 动作描写），不需要像 DM 那样从 JSON 里提取 narrative 字段，所以流式解析简单很多——chunk 直接拼接就行。

## 数字

今天的总产出：

- **6 轮改动**，跨剧情引擎和记忆系统
- **约 25 个文件**，+1200 行，-500 行
- **15 次提交**
- 从审计开始到最后一次 commit，大约 5 小时

全程 Claude Code 驱动。我负责决策（改什么、用什么方案），它负责执行（读代码、写代码、跑构建）。中间有几次它的方案不对（比如最初想给关系值保留数字系统），我否了，它调整。这种协作模式已经很顺了。

剧情引擎的技术债清零了。接下来是高级功能：世界书、预设配置、正则过滤。但那是明天的事。
