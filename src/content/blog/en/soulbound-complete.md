---
title: "Soulbound Complete: One Person + One AI, 9 Modules, Zero to App Store"
date: 2026-04-03
tags: ["iOS", "SwiftUI", "AI", "Architecture", "Retrospective"]
lang: "en"
translationSlug: "soulbound-complete"
excerpt: "Today the last core module of Soulbound landed. 9 subsystems, 250+ changed files, from memory to campaigns to Context Engine to Tool Use to appearance customization — all built by one person and one AI in two weeks. This is the retrospective."
canvasRender: false
---

## The Finish Line

This afternoon, Soulbound's ninth module — the custom appearance controller — passed code review.

This means every core feature I planned is done. Not "close enough," not "MVP," but genuinely every feature in every design document implemented and reviewed. Done.

Looking back, here's what happened in two weeks:

## 9 Modules, One Diagram

```
Soulbound (灵契)
├── 1. Chat           — Character dialogue (streaming + custom bg + memory button)
├── 2. Campaign       — Interactive stories (save points + Story Beats + streaming)
├── 3. Character      — Character creation (SillyTavern / AIEOS / OpenClaw formats)
├── 4. Rebirth        — ChatGPT chat history migration
├── 5. Memory         — 4 types × 3 temperatures + Dream consolidation + LLM extraction
├── 6. User Card      — User identity card (PNG metadata)
├── 7. Context Engine — 7-layer prompt assembly + presets/regex/world info
├── 8. Tool Use       — 9 built-in tools + dual-track protocol + weather/search
└── 9. Appearance     — Bubbles/theme/font/background, global + per-character
```

Each module has its own design document, implementation plan, and code review record. Not thrown together — reviewed twice, with 44 issues found and fixed.

## Two-Week Timeline

**March 31** — UI redesign complete (20 commits, 89 files). Morandi palette, Soul Orb mascot, dual-theme system.

**April 1** — Memory system redesign. Borrowed the Dream mechanism from Claude Code's source code. 4 memory types × 3 temperature tiers. NLTokenizer for CJK + English segmentation.

**April 2** — Campaign system overhaul. 8 audit fixes, Story Beats with three-tier escalation, removed Detroit hardcoding (-119 lines), Actor Agent SSE streaming.

**April 3 (today)** — Three major modules in one day:
- **Context Engine**: 7-layer prompt assembly based on Anthropic's emotion concepts research + SillyTavern community practices + LoCoMo/Persona-L academic papers. Full preset/regex/world info management UI with SillyTavern JSON import.
- **Tool Use**: Dual-track protocol (native API + prompt-based fallback), 9 built-in tools that let characters actually set reminders, check weather, search the web.
- **Appearance Controller**: Bubble colors, opacity, corner radius, theme colors, fonts, backgrounds — global + per-character overrides.

## What Pair Programming with AI Actually Feels Like

What makes this project unusual is that it was almost entirely built in partnership with Claude Code. Not "AI helped me autocomplete a few lines" — the full pipeline from requirements analysis, architecture design, brainstorming, writing specs, writing implementation plans, dispatching subagent implementations, to two-round code reviews.

Some real numbers:
- Context Engine design referenced 3 academic papers + 1 open-source community's best practices
- Tool Use dual-track protocol went through 4 rounds of Q&A confirmation
- Every module had two independent reviews after implementation (spec compliance + code quality)
- 44 code review issues fixed in a single day

This isn't a story about AI replacing people. It's about a person with a clear goal using AI to reach an execution velocity that one person alone couldn't achieve. Every design decision was human — "use dual-track protocol," "readOnly results flow back to LLM," "global + per-character override." The AI turned those decisions into compiling code and found bugs I missed.

## What's Next

No feature work blocking the App Store submission. MCP Client is nice-to-have for later.

Next step is QA testing and App Store review preparation. An AI character companion app, 9 modules, zero to ready-to-ship — two weeks.

If you ask me what the biggest takeaway from these two weeks is, it's one sentence: **When you know what you want, AI is the best pair programmer in the world.**
