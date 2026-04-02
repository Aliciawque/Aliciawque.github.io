---
title: "Rewriting Half an App in a Day: Soulbound's Campaign Engine and Memory System Overhaul"
date: 2026-04-02
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "en"
translationSlug: "soulbound-campaign-overhaul"
excerpt: "8 bug fixes, a Story Beats pacing system, 200 lines of hardcoded game logic deleted, memory system unified from dual-track to single, CJK tokenization support, Actor streaming output — in one day, Soulbound's campaign engine and memory system were essentially rewritten. This is the raw development log."
canvasRender: false
---

## Why

Soulbound's Campaign mode is the most complex module in the app. A DM Agent generates narrative, an MVU engine manages state variables, a save system supports rollback and branching, and an ending collector tracks multi-playthrough progress.

But it had never been properly audited. After finishing the UI redesign and memory system rewrite last week, I decided to give the campaign engine the same treatment.

One audit led to another. Then another. Then five more.

## Round 1: Audit and Fixes

I had Claude do a full audit of the campaign system — saves, rollback, branching, variable control. It went through a dozen files and flagged 4 critical and 6 important issues.

The critical ones:

**Story Beats never auto-completed.** `StoryBeatTracker` had nudge (3 turns) and hint (6 turns), but no autoComplete threshold. If a player refused to pursue a goal, the system would loop hints forever. Fix: added a 9-turn auto-complete gate.

**SET operations had no cap.** `CampaignGameEngine` limited ADD/SUBTRACT to ±10 per turn, but SET had no bounds. The LLM could just `SET trust 100` and skip the entire relationship arc. Fix: SET operations now have a ±20 swing limit — more generous than incremental changes, but can't jump to extremes.

**Undo couldn't handle SET correctly.** The old undo implementation manually computed reverse changes — `ADD 5` becomes `SUBTRACT 5`. But SET is irreversible: what was `trust` before `SET trust 80`? Unknown. Fix: switched to MVU snapshot-based undo. Just restore the previous snapshot. SET reverses correctly.

**EndingCollectionManager wasn't isolated per campaign.** All campaigns shared one `unlocked_endings` UserDefaults key. Endings from Campaign A would show up in Campaign B. Fix: storage key changed to `campaign_unlocked_endings_{campaignId}`.

Also cleaned up 44 lines of dead code in SavePoint and added `scenePhase .background` auto-save.

One commit, 10 files, net -229 lines.

## Round 2: Removing Detroit

This was the oldest technical debt in the codebase.

Soulbound started as a prototype for a Detroit-themed interactive story. `CampaignState` had 12 hardcoded variables — `connorAffection`, `deviancyLevel`, `trustLevel`, `hanksOpinion`, `storyBranch`... even a `StoryBranch` enum (`machine / neutral / deviant`).

`MVUEngine` had a 200-line switch statement handling these fields. `ConditionEvaluator` had `storyBranch` special cases. `CampaignMemoryExporter` had Detroit-specific export logic.

All replaced with generic architecture:

- `CampaignState` keeps only `currentChapter: Int`. Everything else goes in `dynamicVariables: [String: Int]`
- `MVUEngine` drops the switch, delegates to `state.apply()`, reads bounds from variable definitions
- `ConditionEvaluator` uses generic string-to-int mapping instead of `storyBranch` special cases
- Custom `Codable` decoder auto-migrates old saves — detects legacy fields and moves them into `dynamicVariables`

12 files, net -119 lines. Any campaign can run now. No more assumptions about androids.

## Round 3: Story Beats

Campaign mode had a core problem: the LLM didn't know where the story should go.

The DM Agent could generate compelling improvised narrative, but it had no sense of direction. Players could chat at a bar for 20 turns without advancing the plot, because the DM didn't know "what's the goal of this chapter."

Story Beats are waypoints for the DM:

```
Chapter 1, Beat 1: "Player discovers the anomaly in the lab"
Chapter 1, Beat 2: "Player decides whether to report or investigate alone"
```

Each beat has trigger conditions and completion criteria. `StoryBeatTracker` tracks turn count per beat with three-tier escalation:

- **3 turns**: inject nudge into DM prompt ("subtly guide the player toward...")
- **6 turns**: upgrade to hint ("strongly hint at...")
- **9 turns**: autoComplete, force-complete and move on

The DM returns `beat_completed: true` in its JSON response when a goal is achieved. Chapter transitions are gated on required beats — all must complete before the chapter can advance.

During campaign card creation, the LLM auto-generates 2-3 beats per chapter.

8 commits, 9 files, +637 lines.

## Round 4: Memory System Unification

Last week I rewrote the memory system (CharacterMemory), but the old system (ChatCoreMemory) was still running in parallel. Both extractors firing. Both injection paths stuffing data into the prompt. Wasted tokens. Potential contradictions.

This time I merged them completely:

- `ChatMemorySystem.onSessionStart` auto-migrates legacy data — name, occupation, interests, preferences, relationship values all become CharacterMemory entries
- Removed dual injection path (no more `ChatMemoryInjector.buildCoreMemoryContext()`)
- Removed dual extraction path (no more `ChatMemoryAutoExtractor.recordMessage()`)
- `ChatUserCardIntegration` now writes directly to CharacterMemory

Relationship values weren't displayed in any UI, so they could safely convert from numbers to descriptive text. `"Affection: Close (75/100), Trust: Full Trust (85/100)"` lives as a relationship-type memory entry. The always-inject mechanism in `MemoryRetriever` ensures it's in every prompt.

Also fixed a longstanding bug: `MemoryRetriever.extractKeywords()` used `CharacterSet.alphanumerics.inverted` for tokenization, which treated all Chinese characters as delimiters and dropped them. Replaced with Apple's `NLTokenizer` — handles Chinese, Japanese, Korean, and English correctly.

Finally, plugged Dream consolidation (temperature downgrade, dedup, pruning) into the `DailyExportScheduler`'s nightly BGAppRefreshTask — no longer dependent on the user actively backgrounding the app.

## Round 5: Actor Streaming

Soulbound's campaign has a Duo mode — DM handles narration, an AI character handles dialogue. DM Agent already had streaming output (typewriter effect), but Actor Agent waited for the full response before displaying anything.

Added streaming:

- `ActorAgentService` gets `generateResponseStreaming()` + SSE parsing (Anthropic and OpenAI paths)
- `CampaignViewModel` adds `@Published streamingActorResponse`, auto-routes to streaming in duo mode
- `CampaignModeView` adds Actor streaming bubble + auto-scroll

Actor output is plain text (first-person dialogue + action descriptions), no JSON extraction needed unlike the DM's structured response. Streaming is just chunk concatenation.

## Numbers

Today's total output:

- **6 rounds of changes** across the campaign engine and memory system
- **~25 files**, +1200 lines, -500 lines
- **15 commits**
- About 5 hours from first audit to last commit

All driven by Claude Code. I made the decisions (what to change, which approach), it executed (read code, write code, run builds). A few times its proposals were wrong (like wanting to keep numeric relationship values) — I said no, it adjusted. The collaboration pattern is smooth now.

Campaign engine tech debt is at zero. Next up: World Book, presets, regex filtering. But that's tomorrow.
