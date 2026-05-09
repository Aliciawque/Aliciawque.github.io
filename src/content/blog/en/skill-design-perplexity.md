---
title: "Good Human Docs Make Bad Skills: Perplexity Taught Me to Rewrite My Agent Knowledge Base"
date: 2026-05-09
tags: ["Claude Code", "AI", "Skills", "Notes"]
lang: "en"
translationSlug: "skill-design-perplexity"
excerpt: "Read Perplexity's Agent Skills design guide, realized my skills were all making the same mistake: written as human documentation, not as routing tables for models. Audited and rewrote 14 skills. The biggest one lost 150 lines of standard API docs. Key takeaway: description is a routing trigger, gotchas are the highest-value content."
canvasRender: false
---

## How it started

Came across Perplexity's [Designing, Refining, and Maintaining Agent Skills](https://research.perplexity.ai/articles/designing-refining-and-maintaining-agent-skills-at-perplexity). They maintain hundreds of production skills and distilled their lessons into a guide.

After reading it, I realized I was making the same mistakes as most PRs they review: **writing skills as documentation for humans, not as context engineering for models.**

## The most counterintuitive insight

> Good documentation for humans is most often bad documentation for models.

When I wrote my gsap skill, I dutifully listed the full API: `gsap.to()`, `gsap.from()`, `gsap.fromTo()`, transform aliases, timeline position parameters, easing curves... 212 lines total.

But the model **already knows GSAP**. It learned it from training data. Everything I wrote was noise — every token diluting the signal that actually mattered.

Perplexity puts it more sharply:

> "If the implementation is easy to explain, it may be a good idea" — that's the Zen of Python. "If it's easy to explain, the model already knows it. Delete it." — that's the Zen of Skills.

## Six hard rules

The six rules that changed how I write skills:

### 1. Description is a routing trigger

Not "This skill does X." Write "Load when user says X, Y, Z."

My `graphify` skill originally said "any input → knowledge graph → clustered communities → HTML + JSON + audit report." That's a feature description.

Changed to "Load when user says /graphify, build a knowledge graph, visualize relationships, cluster documents." That's a routing instruction. When the model sees "help me visualize how this codebase connects," it knows to load this skill.

### 2. Every sentence must pass the tax test

> "Would the agent get this wrong without this instruction?"

No? Delete it. Every token costs attention in every session, for every user. Perplexity budgets ~100 tokens per skill in the index tier because **everyone pays this cost all the time.**

### 3. Don't write what the model already knows

Standard git command sequences? Delete. CSS transform property mappings? Delete. GSAP API docs? Delete.

Only write what's not in the training data: your judgment, your taste, your gotchas.

### 4. Gotchas are the highest-value content

This hit hardest. Perplexity says gotchas grow over time — they're append-mostly. Every time the agent fails, add a gotcha. These negative examples are more valuable than positive instructions because they tell the model **what not to do.**

I had almost no gotchas sections before. Now 13 skills have them.

### 5. Hub-and-spoke structure

SKILL.md is the hub — keep it lean. Heavy content goes to `references/`, deterministic logic to `scripts/`, templates to `assets/`.

### 6. Don't railroad

Don't write "first run command A, then command B, then command C." Give intent: "Cherry-pick the commit onto a clean branch. Resolve conflicts preserving intent." Let the model figure out execution.

## Audit results

Applied these rules to all 19 owned skills and 3 commands:

| Change | Count |
|---|---|
| Descriptions rewritten as routing triggers | 12 |
| New Gotchas sections added | 13 |
| Redundant/known content removed | 5 |
| Structure optimized | 2 |

The single biggest change was gsap: 212 lines down to 60. Removed all standard GSAP API documentation, kept only non-obvious patterns and gotchas specific to the HyperFrames context.

## The detail that stuck

Perplexity found that **LLM-written skills don't work**:

> "Self-generated Skills provide no benefit on average, showing that models cannot reliably author the procedural knowledge they benefit from consuming."

This means you need to inject your **opinion** into every skill. The model can't write gotchas it doesn't know about. Only humans who've hit the bugs can write them.

This echoes Emil Kowalski's "Agents with Taste": what transfers isn't taste itself, but the habit of articulating *why*. Skills are that articulation.

## Written into CLAUDE.md

These six rules are now baked into my global CLAUDE.md as hard constraints for any new skill. Every time I create or review a SKILL.md, I check against this list.

Also saved a memory file (`feedback_perplexity_skill_design.md`) so future sessions have access to these rules.

## Beyond code

This reframed how I think about "prompt engineering." Writing skills isn't writing code docs. It isn't writing prompts. It's **context engineering** — packing the densest signal into the narrowest pipe the model can see.

Every redundant word makes every other skill worse. Every missing gotcha waits for the next failure.

The title of Perplexity's article is "Designing, Refining, and Maintaining Agent Skills." Refining and Maintaining are the key words. Skills aren't written once. They grow with every agent failure.
