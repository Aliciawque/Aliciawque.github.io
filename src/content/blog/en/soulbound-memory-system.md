---
title: "Teaching AI Characters to Remember: A Memory System Inspired by Claude Code"
date: 2026-04-02
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "en"
translationSlug: "soulbound-memory-system"
excerpt: "AI companions that forget everything after each session feel hollow. I redesigned Soulbound's memory system from scratch — 4 memory types, 3 temperature tiers, and a Dream consolidation process borrowed from Claude Code's own architecture."
canvasRender: false
---

## The Problem

Every AI character companion has the same Achilles heel: memory.

Your character knows your name during a conversation. You tell it you love classical music, that you prefer instrumental pieces at night, that Ashkenazy's Chopin recordings make you feel at peace. It responds beautifully.

Close the app. Open it tomorrow. It has no idea who you are.

Soulbound had a memory system before this redesign — technically. `ChatCoreMemory` stored user profiles and relationship values. A `ChatMemoryAutoExtractor` was supposed to extract important facts every 10 messages. There was even a `ChatHybridMemoryStore` with vector search and BM25.

The reality: half the code was dead. The vector store never initialized successfully. The auto-extractor was wired to an extraction service that was never called. The BM25 search existed but was never instantiated. 15 files, ~4,000 lines of code, mostly doing nothing.

I decided to tear it down and start over.

## Stealing from Claude Code

Before building anything, I studied Claude Code's memory system — not the product features, but the actual source code. I'd already done a deep dive into the codebase a few weeks earlier, and the memory architecture stood out.

Three ideas shaped my redesign:

### 1. Typed Classification

Claude Code doesn't dump everything into a flat list. It uses four memory types: `user` (who you are), `feedback` (how you want to work), `project` (what you're building), `reference` (where to find things).

For an AI companion, I mapped this to:
- **Profile** — user facts (name, job, hobbies)
- **Relationship** — emotional dynamics (trust shifts, interaction preferences)
- **Event** — things that happened (key conversations, promises, turning points)
- **Knowledge** — things the user taught the character (corrections, explanations)

Profile and relationship are "things the character should always know." Event and knowledge are "things to recall when relevant." This distinction matters for retrieval.

### 2. Temperature Tiers

Claude Code has hot memory (current session context), warm memory (indexed files loaded on demand), and archive (raw transcripts grep'd when needed).

I built the same three tiers:
- **Hot** 🔥 — accessed within the last 3 sessions. Priority injection into every prompt.
- **Warm** 🌤 — 3–10 sessions without access. Participates in retrieval but with lower weight.
- **Archive** 📦 — 10+ sessions cold, or importance below 0.3. Only surfaced on exact keyword match.

Memories flow naturally: new memories start hot, cool to warm if unused, eventually archive. But if a cold memory gets retrieved — it heats back up instantly.

### 3. Dream Consolidation

The most elegant part of Claude Code's memory is Dream — a background process that periodically reviews accumulated data and consolidates it. Merge near-duplicates, prune contradictions, delete low-value noise.

My iOS version is simpler (no fork agents on mobile), but follows the same pattern:
1. **Downgrade** cold memories to lower tiers
2. **Merge** near-duplicates (Jaccard similarity > 0.7)
3. **Prune** excess beyond the 200-memory-per-character limit

Dream runs at most once every 24 hours, triggered when the app enters background.

## The Retrieval Algorithm

Not every memory should be in every prompt. Token budgets are real.

The retriever injects at most 5 memories per turn:

**Always-inject** (no scoring): Profile and relationship memories that aren't archived. Top 3 by importance. The character should always know your name and how you two relate.

**Scored retrieval** (event + knowledge): Each candidate gets a composite score:
- Keyword match: 40%
- Importance: 30%
- Temperature bonus: 20% (hot > warm > archive)
- Time recency: 10%

Top remaining slots filled by score. Simple, no vectors, no embeddings. Fast enough for mobile.

## Extraction: Less Is More

The first version of my extractor created 5 memories per batch. After testing, I watched in horror as a 10-message conversation about classical music generated 15 separate memories: "User likes classical music", "User enjoys classical music", "User likes Chopin", "User likes Debussy", "User prefers instrumental music at night"...

The fix was aggressive prompt engineering:
- **Maximum 2 items per extraction** (was 5)
- **Must consolidate related details** into a single memory
- **Return `[]` for trivial exchanges** — greetings, "ok", "go ahead" don't deserve memories
- **Dedup on insert** — Jaccard check against existing memories before writing

After the fix, that same conversation produced one memory: "User enjoys classical music, especially Chopin and Debussy. Prefers purely instrumental pieces for nighttime listening, particularly Ashkenazy's recordings."

## The "Remember This" Button

Auto-extraction handles the background. But sometimes the user knows what's important.

Every AI message now has a small 🧠 icon next to the timestamp. Tap it, and the message gets saved as a memory. Short messages (≤300 characters after stripping markdown) save directly. Long messages get LLM-summarized into a concise memory.

This mirrors how human memory works — you don't remember every word of a conversation, but you might consciously decide "I want to remember this recommendation."

## What I Learned Building It

**Dead code is expensive.** Not in CPU cycles — in cognitive load. The old system had 15 files and 4,000 lines of mostly non-functional code. Every time I tried to understand how memory worked, I had to mentally filter out the dead paths. Deleting it all and starting fresh took less time than trying to fix it.

**SwiftData's ModelContext is not thread-safe.** My first version spawned background `Task {}` blocks for extraction that wrote to the same context the UI was reading from. Worked fine in testing, would have crashed in production. The fix: `@MainActor` on all store-writing tasks.

**Sheet dismiss swallows state updates.** When `AddMemoryView` saved a memory and called its `onSave` callback followed by `dismiss()`, SwiftUI would sometimes drop the state update. Moving the reload to the sheet's `onDismiss` parameter fixed it — the reload happens after the sheet is fully gone.

**`onDisappear` lies.** I used it to trigger session-end memory extraction. But `onDisappear` fires when you open a sheet from the current view — the view is still alive, just hidden. False session-ends everywhere. `scenePhase == .background` is the correct signal.

**The root ModelContainer matters.** I forgot to add `.modelContainer(coordinator.swiftDataContainer)` to the app's root view. Every `@Environment(\.modelContext)` in child views got a default auto-created context instead of the app's actual one. Memories saved in one context were invisible to another. A one-line fix for hours of confusion.

## Final Numbers

- 14 commits
- 8 new files, 15 deleted, ~15 modified
- Net reduction: ~2,000 lines
- 5 core services: Store, Extractor, Retriever, Dream, System orchestrator
- 3 UI views: list (with filters), detail/edit, manual add
- Full code review with 3 critical + 5 important fixes
- All prompts translated from Chinese to English (eliminated language contamination)

The system is live. Characters remember. And when they bring up something you told them three sessions ago — naturally, without breaking the fourth wall — it feels like the app has a soul.

Which, I suppose, is the whole point of calling it Soulbound.
