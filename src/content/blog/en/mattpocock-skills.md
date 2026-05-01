---
title: "Researching mattpocock/skills: What to Steal from a 50k-Star AI Coding Skill Pack"
date: 2026-05-01
tags: ["Claude Code", "Skills", "DevTools"]
lang: "en"
translationSlug: "mattpocock-skills"
excerpt: "Matt Pocock's skills repo hit 50k stars with 16 skills targeting four failure modes of AI coding. The most valuable takeaway isn't any single skill—it's CONTEXT.md, a structured domain vocabulary that makes AI and human speak the same language. I turned it plus module depth analysis into a /sync-context skill."
canvasRender: false
---

## Why I Looked

Matt Pocock may not be a household name, but Total TypeScript probably is. In February 2026 he opened a repo called [skills](https://github.com/mattpocock/skills), positioned with zero pretense: "Skills for Real Engineers. Straight from my .claude directory." Not vibe-coding toys—battle-tested patterns from decades of engineering practice.

50,600 stars. I had to see what was inside.

## Four Failure Modes

Matt distills AI coding failures into four categories:

| Failure Mode | Root Cause | Skill |
|-------------|-----------|-------|
| AI doesn't do what you want | Misaligned communication | `/grill-me`, `/grill-with-docs` |
| AI talks too much | No shared language | CONTEXT.md |
| Code doesn't work | No feedback loop | `/tdd`, `/diagnose` |
| Code becomes spaghetti | No architecture care | `/improve-codebase-architecture`, `/zoom-out` |

The framework itself is clear. Each skill solves exactly one problem. No scope creep.

## The 16 Skills at a Glance

**Engineering (9)** forms the core. `/diagnose` has the most elegant design—Phase 1 isn't "look at logs," it's "build a feedback loop," listing 10 approaches (failing test, curl, Playwright, trace replay, fuzz, bisect...). The core insight: "Build the right feedback loop, and the bug is 90% fixed."

`/tdd` strongly opposes horizontal slicing. Don't write all tests then all implementation. Instead: one test → minimal implementation → verify → next. This complements my existing subagent + dual-review flow.

**Productivity (3)** includes `/caveman`: compress tokens ~75% by stripping articles, filler, hedging while keeping full technical precision. Stays active until you say "stop caveman."

**Misc (4)** is tooling—git-guardrails intercepts dangerous commands, similar to my `/careful`.

## The Coolest Concept: CONTEXT.md

The single most exciting thing in this repo isn't a skill. It's a file format: **CONTEXT.md**.

The idea is dead simple: maintain a structured domain vocabulary for each project.

```markdown
### Order
- **Definition:** A purchase request submitted by a customer, containing one or more LineItems
- **Avoid:** [purchase, transaction] — these words should never appear in code
- **Relations:** Order → has-many → LineItem
```

The effects are immediate:

1. **AI speaks the project's language**—won't call an Order a "purchase," won't call a User a "customer"
2. **Naming consistency**—variables, functions, files follow unified terminology
3. **Major token savings**—no re-explaining "in this project, Order means..."
4. **Faster onboarding**—one table tells you the domain language

Matt also added an "Avoid" field—explicitly listing aliases that **should not** be used. This is more effective than positive definitions alone. You tell AI what "Order" means, and simultaneously that "purchase" and "transaction" are banned in this project.

## Minimal ADRs

Another good concept: Architecture Decision Records trimmed to 1-3 sentences. Only written when all three conditions are met:

- Hard to reverse
- Surprising
- Real tradeoff

Most "decisions" don't need ADRs—only the ones where you'd look back and think "why did we do it this way?"

## Module Deepening

`/improve-codebase-architecture` introduces a precise vocabulary for architecture analysis:

- **Depth**: simple interface + complex implementation = good module (e.g., `fs.readFile`)
- **Seam**: a boundary where implementation can be swapped; a real seam has at least 2 adapters
- **Locality**: related code lives together

The key test method: **the deletion test**. If you delete a module's tests and can still test its behavior, the tests are testing other modules—this module is too shallow and should be merged.

## Comparison with My Skill System

| Dimension | Matt Pocock | My System |
|-----------|------------|-----------|
| Shared language | CONTEXT.md structured vocabulary | No unified mechanism |
| ADRs | Minimal 1-3 sentences | No format |
| Architecture analysis | Module deepening/Depth | No dedicated skill |
| Distribution | .claude-plugin | hook + command |
| Governance | None | ArcKit patterns + memory |

Matt's strength is **language alignment and architecture analysis**. Mine is **governance** (hook/command/memory as a trinity). Complementary.

## What I Built

I absorbed three key concepts into one new skill: `/sync-context`.

**Four actions:**

- `scan` — Scan codebase, extract domain terms, create CONTEXT.md
- `check` — Validate code naming consistency against vocabulary
- `update` — Add/modify terms (supports git diff for detecting new terms)
- `map` — Module depth analysis, identify shallow modules and real seams

The CONTEXT.md format combines Matt's ideas with my practice: term definitions + Avoid aliases + relations + minimal ADRs + Module Map.

## Is It Worth Copying?

**Worth stealing:** CONTEXT.md concept, feedback-loop-first debugging, vertical slicing, module deepening vocabulary, minimal ADRs, `disable-model-invocation` to prevent auto-triggering.

**Skip:** `/grill-me` interview mode (my memory system already covers context accumulation), `/caveman` compression mode (less relevant for Chinese), `/setup-pre-commit` one-shot tooling.

One-sentence summary: **The most valuable thing in Matt's skill pack isn't any single skill—it's the idea that language alignment determines thought precision.** When AI and human speak the same language, every interaction quality goes up a notch.
