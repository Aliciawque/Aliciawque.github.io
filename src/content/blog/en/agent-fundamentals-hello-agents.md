---
title: "16 Chapters on Agents, Only 3 Ideas Changed How I Think"
date: 2026-05-10
tags: ["AI", "Agent", "Lessons"]
lang: "en"
translationSlug: "agent-fundamentals-hello-agents"
excerpt: "Read Datawhale's Hello-Agents tutorial cover to cover. The real takeaways weren't how to write ReAct or wire up MCP — they were three blind spots: more context makes models dumber (Context Rot), context is curated not stuffed (GSSC pipeline), and MCP/A2A/ANP operate on different layers, not in competition."
canvasRender: false
---

## Why I Read It

[Hello-Agents](https://github.com/datawhalechina/hello-agents) is a 16-chapter tutorial by Datawhale — from "what is an agent" to "build a cyber town." 40k stars. I spent two days reading it and took four pages of notes.

Honestly, the first four chapters (definitions, history, LLM basics, classic paradigms) are basic if you've been building with agents. But from chapter 9 on, several things genuinely corrected my mental models.

## Blind Spot 1: More Context = Dumber Model

I always assumed bigger context windows were strictly better — 128K not enough, wait for 1M. Chapter 9 gave this a name: **Context Rot**.

The causes are straightforward:

- Transformer attention is $n^2$. Double the tokens, halve the attention per token
- Positional encoding loses precision in long sequences — the model can't tell token 5000 from token 5001
- Training data has few long-sequence examples — the model never learned to find needles in 100K-token haystacks

This explained something I'd felt using Claude Code on long projects: **the further in, the more Claude repeats things it already did**. It's not "forgetting" — it's signal getting diluted by noise.

This changed my strategy. I used to write system prompts with a "more is safer" mindset. Now I ask: **does the model need this every single time?** If not, it doesn't belong in persistent context.

## Blind Spot 2: Context Is Curated, Not Stuffed

The tutorial presents a pipeline called GSSC: **Gather → Select → Structure → Compress**.

Not an abstraction — a four-step engineering process:

1. **Gather**: Pull from system instructions, memory, RAG, conversation history. Each source wrapped in try-except; one failure doesn't break the pipeline
2. **Select**: Score each info packet. `score = relevance_weight × relevance + recency_weight × recency`. Greedy algorithm fills the token budget by score
3. **Structure**: Output in zones. `[Role & Policies]` `[Task]` `[Evidence]` `[Context]` `[Output]`. Each zone has a job
4. **Compress**: Over budget? Compress. Keep structural information, drop redundant details

My old approach was closer to "shove everything relevant in." GSSC says **budgeted consciousness** — tokens are scarce, and every token competes for attention against every other token.

This lines up perfectly with Perplexity's Skill design principles I'd studied earlier: **every unnecessary word makes everything else worse**. Perplexity was talking about the Skill layer; GSSC applies the same logic to the entire context window.

The tutorial also introduces NoteTool — let the agent write key information to external Markdown files instead of keeping everything in context. Essentially giving the agent a hard drive and treating context as RAM.

## Blind Spot 3: MCP, A2A, and ANP Are on Different Layers

I used to see MCP and A2A as competitors — Anthropic pushes one, Google pushes the other, who wins?

The tutorial puts them on entirely different layers:

| Protocol | Problem it solves | Analogy |
|----------|------------------|---------|
| MCP | How agents call tools | USB-C standard |
| A2A | How agents collaborate with each other | Bluetooth between phones |
| ANP | How agents discover each other at scale | Internet DNS |

**MCP is agent-to-tool.** Three-layer architecture: Host (interface) → Client (connection) → Server (execution). Three core capabilities: Tools (active execution), Resources (passive data), Prompts (templates). Workflow: discover tools → build context → model reasons → tool executes → result integrates.

MCP and Function Calling aren't competitors. FC is a built-in model capability ("knows how to make a phone call"). MCP is the protocol standard ("global phone number format"). They complement each other.

**A2A is agent-to-agent.** P2P mesh topology. Core units are Task and Artifact. Task lifecycle: created → negotiated → delegated → executing → completed. Compared to a central orchestrator: no single point of failure, no performance bottleneck.

**ANP is large-scale discovery.** Uses `.well-known/agent-descriptions` for indexing, DID for identity. Still early stage.

The selection guide is clear:
- Need external services/tools → MCP
- Multi-agent collaboration → A2A
- Large-scale open network → ANP (watch and wait)

All three can coexist.

## A Mental Model for Paradigm Selection

The tutorial's comparison of three classic paradigms also clarified my thinking:

- **ReAct** (interleaved reasoning + action) — exploratory tasks, need to think and look up things
- **Plan-and-Solve** (plan first, execute after) — structured tasks with deterministic paths
- **Reflection** (execute → reflect → refine) — quality-critical tasks where time isn't pressing

This isn't "which is better" — it's a **decision table keyed on task characteristics**. Real projects often combine them: Plan-and-Solve for the plan, ReAct for each step, Reflection for critical checkpoints.

I was already doing something similar with Soulbound's agent system — just without the clear naming. Now I have the vocabulary to match faster next time.

## What I Actually Changed

Three things after reading:

1. Trimmed all system prompts — each line passes the "would the model break without this" tax test
2. Added NoteTool-style external notes for long tasks — key decisions go to files, not context memory
3. Filed the MCP/A2A/ANP layer model — next architecture decision starts with "which layer is this?"

Out of 16 chapters, chapters 4, 9, and 10 are worth a close read. The rest, skim as needed.
