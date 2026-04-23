---
title: "把审美写成规则：一个下午三个 agent 工具的取舍"
date: 2026-04-23
tags: ["Claude Code", "AI", "Skills", "经验分享"]
lang: "zh"
translationSlug: "taste-as-rules"
excerpt: "刷到 emil 的 'Agents with Taste'，他把动画审美写成决策表喂给 agent。我顺手研究了同一团队的 claude-context 和 memsearch 两个工具，最后只装了一个。可 transfer 的从来不是审美本身，是 articulate why 的习惯。"
canvasRender: false
---

## 起因

下午刷到 Emil Kowalski 写的 [Agents with Taste](https://emilkowal.ski/ui/agents-with-taste)。一句话：编码 agent 写功能强，但做视觉/动画时不知道"什么叫好"——把你的审美拆成规则写进 skill 文件，问题就解了。

听起来普通，例子很硬。

## scale(0) 为什么感觉不对

emil 的开场例子：一个元素弹出动画，从 `scale(0)` 起，看起来像凭空出现；从 `scale(0.95)` 起，自然得多。

为什么？因为现实里没东西凭空出现。气球瘪了也有形状。

这就是 why。把它写成一行规则：

```
Element appears from nowhere → Start from scale(0.95), not scale(0)
```

整张表他叫 Practical Tips：

| Scenario | Solution |
|---|---|
| Make buttons feel responsive | `transform: scale(0.97)` on `:active` |
| Element appears from nowhere | Start from `scale(0.95)`, not `scale(0)` |
| Shaky/jittery animations | Add `will-change: transform` |
| Hover causes flicker | Animate child, not parent |
| Popover scales from wrong point | Set `transform-origin` to trigger location |

加上 easing 决策流程图（进出视口→ease-out / 屏内移动→ease-in-out / hover→ease），加上 duration 区间表（micro 100-150ms / 标准 250ms / 模态 300ms / 退出比进入快 ~20%），一个 design-engineering skill 就成型了。

agent 拿到这些不是"参考"，是**直接套**。它会指出哪一行违反了规则，输出 before/after 对比表。

## 装的时候踩了一脚

`npx skills add emilkowalski/skill` 是交互式 picker，要选装到哪个 agent。我直接 git clone 到 `~/.claude/skills/emil-design-eng/`，省事。

```bash
git clone https://github.com/emilkowalski/skill.git /tmp/emil-skill
cp -R /tmp/emil-skill/skills/emil-design-eng ~/.claude/skills/
```

下一句对话里 skill 已经出现在可用列表中，准备用。

## 顺藤摸瓜：zilliz 的两个工具

emil 顶上挂了 Anthropic 的 skill-creator 链接。我顺手去看了同一时期被推得很多的两个 zilliz 项目，主题刚好都是"让 agent 拥有更多上下文"——

### claude-context：codebase 也能向量化

[zilliztech/claude-context](https://github.com/zilliztech/claude-context) 是个 MCP plugin。把整个代码库 AST 切片→embedding→存进 Milvus，agent 用语义搜索代替多轮 grep/glob。

省钱（不用每次塞整个目录进 context）+ 省轮次（百万行也一次命中）。需要 Zilliz Cloud 账号 + OpenAI embedding key。

我没装。理由很冷静：Soulbound、PolyLens、OpenClaw Souls 这几个项目都不到 10 万行，grep 已经快得离谱。引入向量库是为没出现的问题付边际成本。

### memsearch：让 agent 拥有长期记忆

[zilliztech/memsearch](https://github.com/zilliztech/memsearch) 更对我胃口：跨 Claude Code / Codex / OpenClaw / OpenCode 的语义记忆 plugin。

它的架构有点东西：

- **markdown 是 source of truth**，Milvus 只是"影子索引"，可重建
- **三层渐进召回**：search ranked chunks → expand 完整 section → 原始 transcript
- **混合搜索**：BM25 sparse + dense vector + RRF reranking
- **SHA-256 chunk hash 跳过未变内容**，不重复 embedding
- 默认 ONNX bge-m3 本地 embedding（558MB，无 API key）+ Milvus Lite 单文件，零成本

捕获是 Stop hook 触发，每轮对话让 haiku 总结一段，append 到 `memory/YYYY-MM-DD.md`，自动 reindex。

听着很美。但我不会装。

## 为什么没装 memsearch

我的 memory 系统不是这套哲学。

我有 `~/.claude/projects/-Users-kjm/memory/`，每条都是手动写的 .md，frontmatter 严格分四类（user / feedback / project / reference），带 freshness 标签（stable / volatile / time-sensitive），MEMORY.md 是手维护索引。CLAUDE.md 里写着：3 个文件就合并、user/feedback 优先于 project、updated 必须 bump。

memsearch 的 append-everything + 语义召回是**对冲量大、低质量记忆**设计的。我的体系核心是**精选 + 治理**——少而准。两套并存，自动捕获会把治理稀释。

更现实的是：默认 hook 调 Anthropic API 总结每一轮。按我的对话量，账单会很快不优雅。

但 memsearch 给我一个意外验证——我那套 markdown 索引→具体文件→正文，本质就是它的 L1→L2→L3 渐进召回。同一个架构，两种实现，殊途同归。

## 吸收：第 14 条原则

这一下午真正值钱的不是任何一个工具。是 emil 把"审美"这种最难传递的东西**用 articulate why 的方式让它可传递**。

我把这个加到了自己的 `feedback_skill_design_principles.md`，作为第 14 条："审美 → 规则的提炼模式"。提炼步骤：

1. 拿出一个具体反例和正例
2. 一句话说清 why
3. 写成规则
4. 同类规则归纳为决策表，分支多时用流程图

适用类别远不止 UI——代码风格、命名约定、任何"老手一眼看出不对"的领域都吃。

## 可 transfer 的不是审美

emil 的 skill 文件本身只对前端动画有用，离开这个领域价值不大。

但**问 why 的习惯**可以离开。

下次我又说"这里感觉不对/这样才对"的时候，先停一下，把那句"感觉"翻译成"因为 X，所以 Y"。三次以上遇到同类判断 → 写进对应 skill 的决策表。

这才是 transferring taste 的真意——不是把品味打包成文件，是把品味背后**那个不肯放过 why 的姿态**变成你跟 agent 协作的默认动作。
