---
title: "给 AI 叙事引擎装上 NPC 系统"
date: 2026-04-15
tags: ["iOS", "SwiftUI", "AI", "Game Design"]
lang: "zh"
translationSlug: "soulbound-campaign-npc-system"
excerpt: "Soulbound 的剧情模式一直只有「DM 讲故事 + 玩家选择」的基本循环。这次给它加了结构化 NPC、关键物品、节奏控制、转折点回顾，还把单次生成拆成了三步。9 个 task，11 个 commit，一次代码审查修了 5 个 bug。"
canvasRender: false
---

## 问题

Soulbound 的剧情模式已经跑起来了：DM Agent 生成叙事，MVU 引擎管理变量，ConditionEvaluator 评估条件，Story Beats 控制节奏。但有几个明显的缺口：

**NPC 是隐形的。** 角色散落在 sceneDescription、DynamicPrompt、变量名里。DM 只知道"有个人叫 Chen"，不知道 Chen 是什么性格、什么立场、跟玩家什么关系。结果就是 NPC 的行为前后矛盾——上一段还冷若冰霜，下一段突然热情拥抱。

**DM 不主动。** 故事完全是玩家推动的。DM 只是被动回应"你做了 X，结果是 Y"。没有 NPC 会主动找上门来。

**结局太干巴。** 结局页面只有标题 + 描述 + 最终变量值。玩了 5 个章节，看到一句"True Ending: You earned trust"就结束了？那些关键决策呢？NPC 的命运呢？

**生成一锅炖。** 整个 campaign 一次 LLM 调用就生成完了。变量定义、章节结构、结局条件全挤在一个巨大的 prompt 里，LLM 经常顾此失彼。

## 设计

核心想法：**NPC 和 KeyItem 应该是一等公民，不是 prompt 里的临时演员。**

数据模型先行。`NPCDefinition` 结构体包含了一个 NPC 需要的一切：name、role、personalitySummary、personalityTags、relationToProtagonist、boundVariables、emotionalArc。加上 `NPCTrigger`（事件触发器）和 `PersonalEnding`（个人结局）。

`KeyItem` 更简单：一个命名的布尔变量，带 DM 获取提示。"Old Photograph"绑定到 `has_old_photograph`，DM 知道"在第 2 章证据室给玩家这个东西"。

两者都挂在 `CampaignCard` 上，用 `decodeIfPresent` 保证老存档不炸。

## DM 的四个新段落

`buildDMPrompt` 现在会在 DynamicPrompt 之前注入四个段落：

**NPC 注入。** 把当前章节活跃的 NPC 完整信息塞给 DM——性格标签、与主角关系、情感弧线、绑定变量的当前值。"Chen (antagonist): cold, calculating, secretly_caring. chen_trust = 35. 在 trust < 60 之前不要展示温情。"

**节奏指令。** 根据当前章节 Story Beat 的完成比例，自动计算应该是 SETUP / RISING_ACTION / CLIMAX / RESOLUTION。"已完成 3/5 个 beat，推荐节奏：CLIMAX。触发核心对抗，逼迫关键选择。"

**触发事件。** NPC 的 trigger 条件满足时，事件进入 `pendingNPCEvents` 队列。下次 DM 调用时注入："[chen_confrontation]: Chen 在走廊拦住主角，质问失踪的证据。" 并且标注"你必须把这些事件织入叙事，不是可选建议"。

**关键物品。** 列出所有 KeyItem 的状态——哪些已获取、哪些未获取、获取提示是什么。DM 知道什么时候该给玩家钥匙。

## NPC 触发器

`CampaignGameEngine.checkNPCTriggers()` 在每次 `applyStateChanges` 之后运行。遍历所有活跃 NPC 的所有 trigger，用 `ConditionEvaluator` 检查条件。oneShot 的 trigger 只触发一次，ID 存入 `triggeredEventIds`（已有的事件持久化机制）。

触发的事件按 priority 排序后追加到 `pendingNPCEvents`。`CampaignViewModel` 在调用 DM 之前 `consumePendingNPCEvents()`，清空队列并传给 `judgeStreaming`。

## 转折点回顾

结局触发时，`TurningPointExtractor` 从两个来源提取关键时刻：

1. **ChoiceMemory** — 设计师标记的重要选择，自带描述。
2. **MVU 快照差分** — 扫描所有快照间的变量变化，找到影响结局条件的变量跳变 >= 5 的时刻。

合并去重后取 top 5，显示在 EndingView 的叙事和终幕之间。"Ch.1 选择信任 Chen → chen_trust +8"。玩家终于能看到自己的哪些选择导致了这个结局。

NPC 的 PersonalEnding 也在同一时刻解析——`checkNPCPersonalEndings()` 对每个 NPC 找第一个条件满足的个人结局，显示在 EndingView 底部。

## 三步生成

把单次生成拆成三步：

**Foundation** — 世界观、主角定位、NPC 定义、KeyItem 定义。用户可以编辑 NPC 卡片。

**Structure** — 章节、变量（自动从 NPC/KeyItem 的 boundVariables 生成）、Story Beats、DM Rules。NPC 的关系变量自动变成 0-100 的进度条，KeyItem 的变量自动变成 0/1 徽章。

**Endings** — 主线结局 + NPC 个人结局。prompt 要求至少 1 good + 1 bad + 1 hidden，每个有 boundVariables 的 NPC 至少 2 个结局变体。

每一步之间用户都能编辑。生成的不是黑盒——是起点。

## 代码审查

全部写完之后跑了一轮代码审查，发现 5 个问题：

1. **Critical：** Step 2 和 Step 3 生成了数据但没赋值给 ViewModel。生成服务返回了 `GeneratedStructureResult`，但 `chapters`、`variables`、`endings` 还是空的。3-step 生成是个空壳。加了 `applyStructure()` 方法做完整映射。

2. `ForEach(npcEndings, id: \.npcName)` — NPC 同名就崩。改用 `enumerated()` + offset。

3. TurningPoint 的 `turnIndex` 在 ChoiceMemory（章节号 1-5）和快照（数组索引 0-N）之间会冲突，去重时互相吃掉。ChoiceMemory 改用负数索引。

4. `unlockNPCEnding` 写了但没人调用。NPC 结局永远不会持久化。在 EndingView.onAppear 里加了调用。

5. 编辑器里 swipe-to-delete 在 sheet 打开时会导致索引越界。删除前先关 sheet。

## 数字

- 9 个 task，11 个 commit
- 新建 11 个文件，修改 10 个文件
- 3 个数据模型，4 个 DM prompt section，5 个编辑器视图
- 1 个 Critical bug 在代码审查阶段被捕获，没有进入运行时
