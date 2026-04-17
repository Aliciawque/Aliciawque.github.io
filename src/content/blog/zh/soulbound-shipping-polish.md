---
title: "让 LLM 替你做那件 UI 死活做不好的事：Soulbound 上架前最后一轮审查"
date: 2026-04-17
tags: ["iOS", "SwiftUI", "AI", "LLM"]
lang: "zh"
translationSlug: "soulbound-shipping-polish"
excerpt: "P0 Picker 在 iOS 26 上修了 5 次全败——那就让 LLM 直接生成关键章节的解锁条件。P1/P2/P3 全部收尾：3-step 生成稳定化、统一图片裁剪组件、章节描述校验器修 word-vs-char 错配。最后一轮审查又揪出 7 个剧情模式和生成方法的对应性问题。"
canvasRender: false
---

## 半个月的清单

Soulbound 是我的 iOS AI 角色陪伴 app。上周已经把 App Store P1 阻断项全清了（全英化、NavigationStack 迁移、防崩溃 guard）。手边还有一张 20 项的清单，按 P0 / P1 / P2 / P3 排好，P0 只有一条——Chapter Editor 的 Unlock Condition Picker 在 iOS 26 上崩，5 次尝试全败。

今天就是把这张清单清光的一天。

## P1 收尾：3-step 生成流程稳定化

剧情卡生成的 3-step flow（Foundation → Structure → Endings）原来只有 manual 模式走，reference / random / customized 三个非 manual 模式还在走 legacy single-shot——8192 tokens 一把梭，NPC 和 Key Items 永远生不出来。

把三条路径都切到 3-step flow，顺便把 Step 2 内部拆并行：Core（chapters + variables + storyBeats）和 Rules（dmRules + dynamicPrompts + writingStyle）两个 `async let` 一起跑，生成时间从 120s 压到 60s 左右。

LLM 输出 JSON 稳定性是最大的坑。每个 step 都加了 2 次重试 + 500ms 退避，`keyDecodingStrategy = .convertFromSnakeCase` 统一兼容 snake/camel 两种命名。最要命的是 LLM 会给同一个字段出不同 shape——`objectives` 有时候是对象有时候是字符串，`threshold` 有时候是 `{value, description}` 有时候是裸 int，`defaultValue` 有时候是 bool 有时候是数字字符串。写了八个宽松 `init(from:)` 吸收这些变化，不在调用点做脏活。

还加了个小功能：Reference 模式的 prompt 明确告诉 LLM "USER 是独立原创角色，不是原作主角；被参考作品的主角变成核心 NPC"。之前 LLM 总倾向让 user 扮演 Connor，纠正了方向。

## P2：统一图片裁剪

Character 头像、User 头像、Campaign 封面——三个上传入口各用各的图片处理路径：有的用 `UIImagePickerController`，有的用 `PhotosPicker` + 盲目 `resize → pngData()`，日志里经常出现 "Original: 530KB, Compressed: 1.7MB"。

做了两个新组件：

- `ImageProcessor` 工具：crop + resize + encode 三合一，PNG 优先，>800KB 才降级 JPEG 0.85
- `ImageCropperSheet` UI：`DragGesture` + `MagnificationGesture` + 固定裁剪框，1:1 和 3:4 切换

接入 5 个入口（Campaign 封面 3:4、Character 头像 3:4、User 卡头像 1:1 × 2）。Chat 背景不裁剪（允许任意比例）。旧的 `UserCardImagePicker`（UIImagePicker 包装器）删了。

## P3：从日志发现的 4 个细节

**章节描述"过长"其实是校验器错了。** prompt 要求 "150-250 words"（≈ 500-1500 chars），校验器卡 150-300 chars 判超长。单位错配——校验器从来没在量词上对齐。改成 500-1500 chars。

**Narrator perspective 的 Picker 偶尔报 invalid tag。** LLM 输出 `third_person_limited`，Picker 只认 first/second/third_person 三个 tag。加了 `NarratorPerspective.normalize(_:)`，把 `third_person_limited / omniscient / 1st-person / POV: third` 等所有变体都归一到三个标准值。`GeneratedWritingStyle.init(from:)` 和 editor 的 init 都走 normalize。

**HTTP 401 "Missing Authentication header" 偶发但定位不到源头。** `LLMService` 三处 HTTP 错误日志只说 "HTTP Error N"——不知道是哪个上游。加了 `LLMProvider.providerTag`，日志前缀变 `LLM [Anthropic https://api.anthropic.com] HTTP Error 401: ...`，下次一眼就能看出。

**图"压缩"变大的日志**在 P2 替换 CoverImagePickerView 时顺手就清了——老代码盲目 `resize → pngData()` 对已经很小的原图反而撑大，新 `ImageProcessor.encode` 只在 PNG > 800KB 且 JPEG 更小的时候才降级。

## P0：让 LLM 做那件 UI 做不好的事

Chapter Editor 有一个 "Requires Unlock Condition" toggle，打开后是一个 `ConditionBuilderView`——里面嵌着 `Menu`，`Menu` 里嵌 `Picker`。iOS 26 上用户选变量后整个 section 崩，5 次尝试（`.sheet(item:)` 迁移、`onChange` 实时持久化、`@StateObject`、`.id(chapter.id)`、`Menu → Picker`）全败。

今天打算第 6 次尝试。想了一会儿，突然意识到——我在修的是一个用户其实不太需要自己填的表单。

剧情卡的生成是 LLM 驱动的。LLM 已经在 Step 2 里给每章生成了 `objectives`、`transition`、`branchConditions`。我只是额外想让用户能在 Chapter Editor 里**编辑**这些条件。但为什么不让 LLM 直接生成这些条件？

设计调整：

- `Chapter` 加一个 `isKeyChapter: Bool?` 字段——只有 key 章节才用 unlock condition 做分叉门槛
- Step 2 Structure 的 prompt 明确让 LLM 标记 1-2 个 key chapters（临近结局分叉的那些），每个带 `unlockCondition` 表达式
- Chapter 1 强制非 key（任何情况下第一章都必须解锁）
- 非 key 章节走普通 transition，不 gate

`CampaignCard.isChapterUnlocked` 接通 `ConditionEvaluator`（之前居然是 `return true` 的 phase 2 stub！），`CampaignGameEngine.autoTransitionIfReady` 在 branch 和 default transition 两条路径上都 check 解锁门。下一章是 key 且门槛未达时 DM prompt 注入一个 `BRANCH GATE` 段——列出门槛变量当前值，指示 DM "自然推进，别念阈值"。

UI 侧：Chapter Editor 的 Unlock Condition section 完全重写。Toggle + 纯 TextEditor 表达式输入 + 变量 chip 快速插入（点一下变量名，自动拼 `varname >= ` 到表达式末尾）。彻底避开 Menu/Picker 组合。saveChapter 顺手修了一个 data-loss bug——旧代码只保 title/unlockCondition/sceneDescription/availableActions，把 objectives/transition/sceneMood 都丢了。

Chapter 列表加 KEY 徽章 + Gate 表达式预览。

一次 commit，26 文件，+4063/−415。

## 第二轮：对应性审查

收尾之后，趁记忆新鲜，让我问你一件事：四种剧情卡生成方法（Manual / Reference / Random / Customized）和两种剧情模式（Solo / Duo）的对应关系顺吗？DM 真能控场吗？所有结局都能触发吗？

让 explore agent 过了一遍，揪出 1 个 BLOCKER 和 7 个 HIGH/MEDIUM。

**BLOCKER**：兜底 ending 的条件是 `"currentChapter >= 10"`，但章节数最多 5。如果 campaign 没定义 endings（manual 模式常见），玩家玩到最后一章看不到 EndingView，卡死。

修：`ConditionEvaluator` 加了 bare `"true"` / `"false"` 字面量支持（之前只识别 `variable op value`），兜底 ending 改 `condition: "true"` priority 1。

**HIGH 1**：`buildPacingDirective` 无 storyBeats 时 return ""——manual 模式的卡 DM 完全没节奏指示。改成 fallback 按 `currentChapter / totalChapters` 比例走 SETUP / RISING_ACTION / CLIMAX / RESOLUTION 四段式。

**HIGH 2**：`checkNPCPersonalEndings` 只在 main ending 触发时 check——NPC 的 arc 如果没和 main ending 同帧满足就永远不放。移到每回合 check，新解锁的 NPC ending 发一条 `✨ NPCName — Title` 系统消息，CampaignModeView 通过 `onChange(of: resolvedNPCEndings.count)` 同步到 `EndingCollectionManager`。

**HIGH 3**：SavePoint 不存 `gameMode`——用户存档时是 Duo 模式，加载存档再选 Solo，session 中途切模式，characterCard 上下文孤儿化。SavePoint 加 `gameMode` 和 `characterCardId` 字段（optional、decodeIfPresent 兼容旧存档），mode selection view 检测 `restoreFromSavePoint?.gameMode` 存在就显示 LOCKED 徽章并禁掉切换。

**MEDIUM**：Export 前 validate 警告（空 endings / 空 NPCs / 无 key chapters）、ending 排序加类型权重 tie-break（`true_end > good > hidden > bad`）、bad ending 限 `currentChapter >= 2` 防一回合 game over、`buildNPCSection` 加 story-phase 头让 DM 读静态 emotionalArc 时对齐当前章节进度 + 每个 NPC 展示 personal ending 条件。

二次 commit，10 文件，+325/−66。

## 数字

今天总产出：
- **2 次 commit**，覆盖 P0-P3 + 审查修复
- **36 个文件**，+4388 行，−481 行
- **3 个新组件**（ImageProcessor、ImageCropperSheet、EndingEditorView）
- Soulbound 的 P0 / P1 / P2 / P3 全部清零

工作流还是 Claude Code 驱动。我负责决策（选方案、权衡取舍），它负责执行（读代码、写代码、编译验证）。今天的 P0 比较有代表性——5 次尝试修 Picker 都失败，最后一次是 Claude 先详细列了 5 条未尝试的诊断思路（`fullScreenCover`、`NavigationLink push`、pure text expression fallback……），我看到 "pure text expression fallback" 的瞬间就想通了——根本不用修 Picker，让 LLM 直接生成条件，UI 改成纯文本表达式输入就行了。

有时候"修不好"其实是信号：你在修的东西压根不该存在。

上架的技术清单清完了。接下来是模拟器黄金路径测试 + 准备素材。但那是明天的事。
