---
title: "Taste as Rules: An Afternoon with Three Agent Tools"
date: 2026-04-23
tags: ["Claude Code", "AI", "Skills", "Notes"]
lang: "en"
translationSlug: "taste-as-rules"
excerpt: "I read Emil Kowalski's 'Agents with Taste', where he packages animation taste into decision tables and feeds them to coding agents. Then I researched two related tools from zilliz, claude-context and memsearch — and only installed one. What actually transfers isn't taste itself. It's the habit of articulating why."
canvasRender: false
---

## How it started

This afternoon I read Emil Kowalski's [Agents with Taste](https://emilkowal.ski/ui/agents-with-taste). The pitch in one line: coding agents are great at functionality but have no idea what "good" feels like in visual work — package your taste into rules inside a skill file, problem solved.

Sounds ordinary. The examples are sharp.

## Why scale(0) feels wrong

Emil's opening example: an element animating in. From `scale(0)` it looks like it appeared from nowhere. From `scale(0.95)` it feels natural.

Why? Because nothing in the real world appears from nothing. A deflated balloon still has shape.

That's the why. Write it as a rule:

```
Element appears from nowhere → Start from scale(0.95), not scale(0)
```

The full table he calls Practical Tips:

| Scenario | Solution |
|---|---|
| Make buttons feel responsive | `transform: scale(0.97)` on `:active` |
| Element appears from nowhere | Start from `scale(0.95)`, not `scale(0)` |
| Shaky/jittery animations | Add `will-change: transform` |
| Hover causes flicker | Animate child, not parent |
| Popover scales from wrong point | Set `transform-origin` to trigger location |

Add an easing decision flowchart (entering/exiting viewport → ease-out / on-screen movement → ease-in-out / hover → ease), add a duration table (micro 100-150ms / standard 250ms / modal 300ms / exits ~20% faster than entrances), and a design-engineering skill is born.

Agents don't "consult" these. They **apply** them — flagging which line breaks the rule and emitting a before/after diff table.

## Stubbed my toe installing it

`npx skills add emilkowalski/skill` is an interactive picker that wants you to choose which agent to install into. I just git-cloned it straight into `~/.claude/skills/emil-design-eng/`:

```bash
git clone https://github.com/emilkowalski/skill.git /tmp/emil-skill
cp -R /tmp/emil-skill/skills/emil-design-eng ~/.claude/skills/
```

Next message, the skill was already in the available list, ready to use.

## Following the thread: zilliz's two tools

Emil links to Anthropic's skill-creator at the top. That led me to two zilliz projects getting a lot of attention recently — both about giving agents more context.

### claude-context: codebases as vectors too

[zilliztech/claude-context](https://github.com/zilliztech/claude-context) is an MCP plugin. AST-chunk your whole codebase → embed → store in Milvus. Agents do semantic search instead of round after round of grep/glob.

Saves money (no more dumping entire directories into context) and saves turns (millions of lines, one hit). Needs a Zilliz Cloud account plus an OpenAI embedding key.

I didn't install it. Cold reasoning: Soulbound, PolyLens, OpenClaw Souls — none are over 100k LOC. grep is already absurdly fast. Adding a vector DB is paying marginal cost for a problem I don't have.

### memsearch: long-term memory for agents

[zilliztech/memsearch](https://github.com/zilliztech/memsearch) was more my speed: a cross-platform semantic memory plugin spanning Claude Code / Codex / OpenClaw / OpenCode.

The architecture has some teeth:

- **Markdown is the source of truth**, Milvus is just a "shadow index" — rebuildable
- **Three-layer progressive recall**: search ranked chunks → expand to full section → original transcript
- **Hybrid search**: BM25 sparse + dense vector + RRF reranking
- **SHA-256 chunk hashes skip unchanged content** — no re-embedding
- Default ONNX bge-m3 embedding runs locally (558MB, no API key) + Milvus Lite single-file, zero cost

Capture is a Stop hook — after every conversation turn, haiku summarizes, appends to `memory/YYYY-MM-DD.md`, auto-reindexes.

Sounds beautiful. I'm not installing it.

## Why memsearch isn't for me

My memory system runs a different philosophy.

`~/.claude/projects/-Users-kjm/memory/` is hand-written .md files, strict four-type frontmatter (user / feedback / project / reference), freshness tags (stable / volatile / time-sensitive), MEMORY.md as a manual index. CLAUDE.md spells out the rules: merge after three files, user/feedback take priority over project, always bump `updated`.

memsearch's append-everything + semantic recall is designed for **high-volume, low-quality** memory. Mine is **curated and governed** — fewer, sharper. Run them side by side and the auto-capture dilutes the curation.

More concretely: the default hook hits the Anthropic API to summarize every turn. At my conversation rate the bill stops being elegant fast.

But memsearch gave me an unexpected confirmation — my markdown index → file → section pattern is exactly its L1 → L2 → L3 progressive recall. Same architecture, two implementations, converging answers.

## Absorbed: principle #14

The valuable thing this afternoon wasn't any of the tools.

It was Emil taking the hardest-to-transfer thing — taste — and making it transferable by **articulating the why**.

I added it to my own `feedback_skill_design_principles.md` as principle #14: "Taste-to-Rule extraction." The steps:

1. Pull a concrete bad example and good example
2. State the why in one sentence
3. Write it as a rule
4. Group similar rules into decision tables; use flowcharts when branches multiply

Applies far beyond UI — code style, naming conventions, anything an experienced eye spots wrong instantly.

## What actually transfers isn't taste

Emil's skill file itself only helps with frontend animation. Outside that domain, limited value.

But **the habit of asking why** travels.

Next time I catch myself saying "this feels off" / "that's how it should be," I'm pausing first to translate the feeling into "because X, therefore Y." Three rounds of similar judgment → it goes into the corresponding skill's decision table.

That's the real meaning of transferring taste. Not packaging your palate into a file — turning the **stance of refusing to let why slip away** into your default move when working with agents.
