---
title: "教 AI 角色记住你：一个受 Claude Code 启发的记忆系统"
date: 2026-04-02
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "zh"
translationSlug: "soulbound-memory-system"
excerpt: "每次关闭 app 角色就失忆，这种体验太空洞了。我从零重设计了 Soulbound 的记忆系统——4 种记忆类型、3 级温度分层、一个从 Claude Code 源码里偷来的 Dream 整理机制。"
canvasRender: false
---

## 问题

每个 AI 角色陪伴 app 都有同一个死穴：记忆。

对话中，角色知道你的名字。你告诉它你喜欢古典音乐，晚上偏好纯器乐，阿什肯纳齐弹的肖邦让你很平静。它回应得很好。

关掉 app。明天再打开。它完全不认识你了。

Soulbound 之前其实有记忆系统——技术上来说。`ChatCoreMemory` 存用户画像和关系数值。`ChatMemoryAutoExtractor` 每 10 条消息触发提取。还有一个 `ChatHybridMemoryStore`，支持向量搜索和 BM25。

现实是：一半代码是死的。向量存储从来没成功初始化过。自动提取器连接到一个从未被调用的服务。BM25 搜索存在但从未实例化。15 个文件，约 4000 行代码，大部分什么都没做。

我决定推倒重来。

## 从 Claude Code 偷师

动手之前，我研究了 Claude Code 的记忆系统——不是产品功能，是实际源码。几周前我已经深入分析过整个代码库，记忆架构最让我印象深刻。

三个核心思路影响了我的重设计：

### 1. 类型化分类

Claude Code 不是把所有东西扔进一个扁平列表。它用四种记忆类型：`user`（你是谁）、`feedback`（你想怎么协作）、`project`（你在做什么）、`reference`（去哪找信息）。

对应到 AI 陪伴场景：
- **Profile** — 用户事实（名字、职业、爱好）
- **Relationship** — 情感动态（信任变化、互动偏好）
- **Event** — 发生过的事（关键对话、承诺、转折点）
- **Knowledge** — 用户教给角色的东西（纠正、解释）

Profile 和 Relationship 是"角色应该始终知道的"。Event 和 Knowledge 是"相关时才想起来的"。这个区分对检索策略至关重要。

### 2. 温度分层

Claude Code 有热记忆（当前会话上下文）、温记忆（按需加载的索引文件）和归档（需要时 grep 的原始记录）。

我建了同样的三层：
- **Hot** 🔥 — 最近 3 次会话内访问过。优先注入每个 prompt。
- **Warm** 🌤 — 3-10 次会话未访问。参与检索但权重更低。
- **Archive** 📦 — 10+ 次会话未访问，或重要性低于 0.3。仅精确匹配时触及。

记忆自然流转：新记忆从 hot 开始，长期不用降为 warm，最终归档。但如果一条冷记忆被检索命中——立刻回到 hot。

### 3. Dream 整理

Claude Code 记忆中最优雅的部分是 Dream——一个后台进程，定期审查积累的数据并整合。合并近似重复，清理矛盾，删除低价值噪声。

我的 iOS 版本更简单（手机上没有 fork agent），但遵循同样的模式：
1. **降温**——把冷记忆降到更低层级
2. **合并**——近似重复的记忆合为一条（Jaccard 相似度 > 0.7）
3. **清理**——超过每角色 200 条上限的，从最低价值的归档开始删

Dream 每 24 小时最多运行一次，在 app 进入后台时触发。

## 检索算法

不是所有记忆都应该塞进每个 prompt。Token 预算是真实的。

检索器每轮最多注入 5 条记忆：

**必注入**（不参与评分）：未归档的 Profile 和 Relationship 记忆，按重要性取前 3。角色应该始终知道你的名字和你们的关系状态。

**评分检索**（Event + Knowledge）：每条候选记忆获得综合评分：
- 关键词匹配：40%
- 重要性：30%
- 温度加成：20%（hot > warm > archive）
- 时间衰减：10%

按评分填充剩余槽位。简单，没有向量搜索，没有 embedding。在移动端够快。

## 提取：少即是多

第一版提取器每批生成 5 条记忆。测试后我看着一段关于古典音乐的 10 条消息对话生成了 15 条独立记忆："用户喜欢古典音乐"、"用户享受古典音乐"、"用户喜欢肖邦"、"用户喜欢德彪西"、"用户晚上偏好器乐"……

修复方式是激进的 prompt 工程：
- **每次提取最多 2 条**（原来 5 条）
- **必须将相关细节合并**为一条记忆
- **琐碎对话返回空数组**——问候、"好的"、"继续" 不值得记住
- **写入前去重**——Jaccard 检查已有记忆再决定是否插入

修复后，同一段对话只产生一条记忆："User enjoys classical music, especially Chopin and Debussy. Prefers purely instrumental pieces for nighttime listening, particularly Ashkenazy's recordings."

## "记住这个"按钮

自动提取处理后台。但有时候用户自己知道什么重要。

每条 AI 消息的时间戳旁边都有一个小 🧠 图标。点击它，这条消息就被保存为记忆。短消息（去掉 Markdown 后 ≤300 字符）直接保存。长消息经过 LLM 总结，压缩成简洁的要点记忆。

这模拟了人类记忆的工作方式——你不会记住对话的每一个字，但你可能会有意识地决定"我想记住这个推荐"。

## 踩过的坑

**死代码的代价不在 CPU，在认知负荷。** 旧系统有 15 个文件、4000 行基本不工作的代码。每次我试图理解记忆是怎么工作的，都要在脑中过滤掉一堆死路径。全删重来比修补花的时间更少。

**SwiftData 的 ModelContext 不是线程安全的。** 第一版在后台 `Task {}` 里做提取并写入同一个 context，而 UI 同时在读。测试没问题，生产环境会崩。修复：所有写入 store 的 Task 加 `@MainActor`。

**Sheet dismiss 会吞掉状态更新。** `AddMemoryView` 保存记忆后调 `onSave` 回调再 `dismiss()`，SwiftUI 有时会丢掉状态更新。把刷新逻辑移到 sheet 的 `onDismiss` 参数里解决了——在 sheet 完全关闭后才执行。

**`onDisappear` 会说谎。** 我用它触发会话结束时的记忆提取。但从当前视图打开一个 sheet 时 `onDisappear` 也会触发——视图还活着，只是被遮住了。到处都是假的 session-end。`scenePhase == .background` 才是正确信号。

**根视图的 ModelContainer 很关键。** 忘了在 app 根视图加 `.modelContainer(coordinator.swiftDataContainer)`。结果每个子视图的 `@Environment(\.modelContext)` 拿到的是 SwiftUI 自动创建的默认 context，不是 app 真正的那个。一个 context 里存的记忆，在另一个 context 里完全看不到。一行代码的修复，几小时的困惑。

## 最终数据

- 14 次提交
- 新增 8 个文件，删除 15 个，修改约 15 个
- 净减约 2000 行代码
- 5 个核心服务：Store、Extractor、Retriever、Dream、System 编排器
- 3 个 UI 视图：列表（带筛选）、详情/编辑、手动添加
- 完整代码审查，修复 3 个 Critical + 5 个 Important 问题
- 所有 prompt 从中文翻译为英文（消除语言污染）

系统已上线。角色能记住你了。当它在三次会话后自然地提起你之前说过的事——不打破第四面墙——感觉这个 app 有了灵魂。

嗯，这大概就是它叫 Soulbound 的原因。
