---
title: "Adding an NPC System to an AI Narrative Engine"
date: 2026-04-15
tags: ["iOS", "SwiftUI", "AI", "Game Design"]
lang: "en"
translationSlug: "soulbound-campaign-npc-system"
excerpt: "Soulbound's campaign mode only had a basic 'DM narrates + player chooses' loop. This update adds structured NPCs, key items, pacing control, turning point review, and splits single-pass generation into three steps. 9 tasks, 11 commits, 5 bugs caught in code review."
canvasRender: false
---

## The Problem

Soulbound's campaign mode was functional: DM Agent generates narrative, MVU engine manages variables, ConditionEvaluator checks conditions, Story Beats control pacing. But there were obvious gaps:

**NPCs were invisible.** Characters were scattered across sceneDescription, DynamicPrompt, and variable names. The DM knew "there's someone called Chen" but not Chen's personality, stance, or relationship with the player. Result: NPCs acted inconsistently — icy one paragraph, warmly embracing the next.

**The DM was passive.** Story was entirely player-driven. The DM only reacted: "you did X, result is Y." No NPC would ever seek the player out.

**Endings were barren.** The ending screen showed a title, description, and final variable values. Five chapters of story, and you get "True Ending: You earned trust"? Where are the pivotal decisions? What happened to the NPCs?

**Generation was monolithic.** The entire campaign was generated in one LLM call. Variable definitions, chapter structure, ending conditions — all crammed into one massive prompt. The LLM regularly dropped details.

## Design

Core idea: **NPCs and KeyItems should be first-class citizens, not extras in a prompt.**

Data models first. `NPCDefinition` contains everything an NPC needs: name, role, personalitySummary, personalityTags, relationToProtagonist, boundVariables, emotionalArc. Plus `NPCTrigger` (event triggers) and `PersonalEnding` (per-NPC endings).

`KeyItem` is simpler: a named boolean variable with DM acquisition hints. "Old Photograph" binds to `has_old_photograph`, and the DM knows "give this to the player in the evidence room in chapter 2."

Both live on `CampaignCard`, using `decodeIfPresent` so existing saves don't break.

## Four New Sections in the DM Prompt

`buildDMPrompt` now injects four sections before DynamicPrompts:

**NPC injection.** Full NPC info for every character active in the current chapter — personality tags, protagonist relationship, emotional arc, current bound variable values. "Chen (antagonist): cold, calculating, secretly_caring. chen_trust = 35. Do NOT show warmth until trust >= 60."

**Pacing directive.** Auto-computed from Story Beat completion ratio in the current chapter: SETUP / RISING_ACTION / CLIMAX / RESOLUTION. "3/5 beats completed, recommended pacing: CLIMAX. Trigger core confrontations, force pivotal choices."

**Triggered events.** When an NPC trigger's condition is met, the event enters `pendingNPCEvents`. Next DM call injects it: "[chen_confrontation]: Chen corners the protagonist in the hallway, demanding answers about the missing evidence." Marked as mandatory — "You MUST weave these events into your narrative."

**Key items.** Lists all KeyItem status — acquired vs. not, with acquisition hints. The DM knows when to hand the player a key.

## NPC Triggers

`CampaignGameEngine.checkNPCTriggers()` runs after every `applyStateChanges`. It iterates all active NPCs' triggers, checking conditions via `ConditionEvaluator`. One-shot triggers fire once, their IDs stored in `triggeredEventIds` (existing event persistence).

Fired events are sorted by priority and appended to `pendingNPCEvents`. `CampaignViewModel` calls `consumePendingNPCEvents()` before the DM call, clearing the queue and passing events to `judgeStreaming`.

## Turning Point Review

When an ending triggers, `TurningPointExtractor` pulls key moments from two sources:

1. **ChoiceMemory** — Designer-marked important decisions with descriptions.
2. **MVU snapshot diffs** — Scans consecutive snapshots for variables referenced in the ending condition that jumped by >= 5.

Merged, deduplicated, top 5, displayed between the narrative and epilogue in EndingView. "Ch.1 Chose to trust Chen → chen_trust +8". Players can finally see which decisions led to this ending.

NPC PersonalEndings resolve at the same time — `checkNPCPersonalEndings()` finds the first matching personal ending per NPC, displayed at the bottom of EndingView.

## Three-Step Generation

Single-pass generation split into three steps:

**Foundation** — World setting, protagonist role, NPC definitions, KeyItem definitions. User can edit NPC cards between steps.

**Structure** — Chapters, variables (auto-generated from NPC/KeyItem boundVariables), Story Beats, DM Rules. NPC relationship variables become 0-100 progress bars automatically. KeyItem variables become 0/1 badges.

**Endings** — Main endings + NPC personal endings. The prompt requires at least 1 good + 1 bad + 1 hidden main ending, and at least 2 personal ending variants per NPC with bound variables.

Users can edit between each step. The generation is a starting point, not a black box.

## Code Review

After all implementation, I ran a code review. It caught 5 issues:

1. **Critical:** Steps 2 and 3 generated data but never assigned it to the ViewModel. The generation service returned `GeneratedStructureResult`, but `chapters`, `variables`, `endings` stayed empty. The entire 3-step flow was a shell. Added `applyStructure()` for full mapping.

2. `ForEach(npcEndings, id: \.npcName)` — crashes on duplicate NPC names. Switched to `enumerated()` with offset-based identity.

3. TurningPoint `turnIndex` collided between ChoiceMemory (chapter numbers 1-5) and snapshots (array indices 0-N). Deduplication was silently eating entries. ChoiceMemory now uses negative indices.

4. `unlockNPCEnding` was implemented but never called. NPC ending progress would never persist. Added the call in `EndingView.onAppear`.

5. Swipe-to-delete in editor views could crash when a sheet was open for a different index. Now dismisses the sheet before removing.

## Numbers

- 9 tasks, 11 commits
- 11 new files, 10 modified files
- 3 data models, 4 DM prompt sections, 5 editor views
- 1 Critical bug caught during code review, never reached runtime
