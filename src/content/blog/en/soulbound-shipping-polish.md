---
title: "Let the LLM Do the Thing Your UI Keeps Failing At: Soulbound's Final Shipping Audit"
date: 2026-04-17
tags: ["iOS", "SwiftUI", "AI", "LLM"]
lang: "en"
translationSlug: "soulbound-shipping-polish"
excerpt: "Five attempts to fix the P0 Picker on iOS 26, all failed — so let the LLM generate the key-chapter unlock conditions directly instead. P1/P2/P3 cleared: 3-step generation hardening, unified image cropper, chapter-description validator fix for a word-vs-char unit mismatch. One last audit pass turned up seven more alignment issues between generation modes and play modes."
canvasRender: false
---

## The Punch List

Soulbound is my iOS AI companion app. Last week I cleared the App Store P1 blockers (full English, NavigationStack migration, defensive guards on crash paths). A 20-item punch list remained, sorted P0 / P1 / P2 / P3. P0 had exactly one entry — the Chapter Editor's Unlock Condition Picker was broken on iOS 26 and five attempts to fix it had all failed.

Today was clear-the-list day.

## P1 Wrap: 3-Step Generation Hardening

The 3-step flow (Foundation → Structure → Endings) was only wired into Manual mode. Reference / Random / Customized were still using a legacy single-shot call — 8192 tokens in one go, and NPCs + Key Items were never generated.

Rewired all three paths to the 3-step flow and split Step 2 internally: Core (chapters + variables + storyBeats) and Rules (dmRules + dynamicPrompts + writingStyle) run as two parallel `async let` blocks. Generation time dropped from ~120s to ~60s.

LLM JSON stability was the biggest trap. Every step now has 2 retries with 500ms backoff, and `keyDecodingStrategy = .convertFromSnakeCase` unifies snake/camel naming. The worst part: the LLM emits different shapes for the same field — `objectives` sometimes an object, sometimes a string; `threshold` sometimes `{value, description}`, sometimes a bare int; `defaultValue` sometimes a bool, sometimes a numeric string. I wrote eight lenient `init(from:)` decoders to absorb those variants instead of patching call sites.

Small bonus: the Reference-mode prompt now explicitly tells the LLM "the USER is a SEPARATE original character, not the referenced work's protagonist; the protagonist becomes a central NPC instead." Before, the LLM kept casting the user as Connor (or whatever the referenced IP lead was). Now it stays out of the way.

## P2: Unified Image Cropper

Character avatar, user avatar, campaign cover — three upload entry points, each with its own image-processing path. Some used `UIImagePickerController`, others `PhotosPicker` + a naive `resize → pngData()`. The logs were full of "Original: 530KB, Compressed: 1.7MB" — the compression was making things worse.

Two new pieces:

- `ImageProcessor` utility: crop + resize + encode in one call. PNG first, falls back to JPEG 0.85 only if the PNG is > 800KB and JPEG would be smaller.
- `ImageCropperSheet` UI: `DragGesture` + `MagnificationGesture` inside a fixed crop frame, 1:1 and 3:4 toggle.

Wired into five entry points (Campaign cover 3:4, Character avatar 3:4, User-card avatars 1:1 × 2). Chat background stays un-cropped (arbitrary aspect). The old `UserCardImagePicker` (a UIImagePickerController wrapper) is gone.

## P3: Four Things I Spotted in the Logs

**"Scene description too long" was actually a validator bug.** The prompt asks for "150-250 words" (≈ 500-1500 chars), but the validator flagged anything over 300 chars. Unit mismatch — no one had ever aligned the two. Loosened the validator to 500-1500 chars.

**Picker occasionally complained "third_person_limited invalid."** The LLM emitted variants; the Picker only accepted three canonical tags. Added `NarratorPerspective.normalize(_:)` that maps `third_person_limited / omniscient / 1st-person / POV: third` and other variants back to first/second/third_person. Applied in both `GeneratedWritingStyle.init(from:)` and the editor's init.

**HTTP 401 "Missing Authentication header" was impossible to trace.** The `LLMService` error logs just said "HTTP Error N" — no provider tag. Added `LLMProvider.providerTag` and prefixed every HTTP error with `LLM [Anthropic https://api.anthropic.com] HTTP Error 401: ...`. Next 401 will point straight at the offending upstream.

**The "compressed > original" log** was cleared as a side effect of P2 — the old code did a naive `resize → pngData()` that bloated already-small images. The new `ImageProcessor.encode` only drops to JPEG when PNG is actually > 800KB AND the JPEG is smaller.

## P0: Let the LLM Do What the UI Can't

The Chapter Editor had a "Requires Unlock Condition" toggle that opened a `ConditionBuilderView` with a `Menu` inside which was a `Picker`. On iOS 26, the entire section collapsed when a user selected a variable. Five attempts over five commits — `.sheet(item:)` migration, `onChange` live-persist, `@StateObject`, `.id(chapter.id)`, `Menu → Picker` rewrite — none worked.

I was about to try attempt six. Then I stopped and noticed something: I was fixing a form the user didn't actually need to fill.

Campaign cards are LLM-generated. Step 2 of the generation flow already produces `objectives`, `transition`, `branchConditions` per chapter. The Unlock Condition editor existed because I wanted users to optionally **edit** those conditions. But why not have the LLM generate them outright?

The redesign:

- `Chapter` gets an `isKeyChapter: Bool?` field. Only key chapters use `unlockCondition` as a branch gate.
- Step 2 Structure prompt now explicitly instructs the LLM to mark 1-2 chapters as key (usually the penultimate or a mid-story hinge) with an `unlockCondition` expression.
- Chapter 1 is always non-key (enforced defensively even if the LLM disobeys the prompt).
- Non-key chapters advance through the normal transition system, ungated.

`CampaignCard.isChapterUnlocked` got wired into `ConditionEvaluator` (it was literally `return true` with a "Phase 2" stub). `CampaignGameEngine.autoTransitionIfReady` consults the gate on both branch and default transitions. When the next chapter is key and its condition isn't satisfied yet, the DM prompt injects a `BRANCH GATE` section listing the current values of the gate variables and instructing the DM to "steer organically — don't announce thresholds."

On the UI side: I rewrote the Unlock Condition section as Toggle + plain `TextEditor` for the expression + a chip row that inserts variable names (tap a variable and it appends `varname >= ` to the expression). No Menu, no Picker. `saveChapter` also got a long-overdue fix — it was only persisting title/unlockCondition/sceneDescription/availableActions and silently dropping objectives/transition/sceneMood.

Chapter list rows show a KEY badge + gate expression preview.

One commit, 26 files, +4063/−415.

## Second Pass: Alignment Audit

With the list cleared and context still warm, I asked one more question: do the four generation methods (Manual / Reference / Random / Customized) align correctly with the two play modes (Solo / Duo)? Does the DM actually keep control? Can every generated ending actually fire?

An Explore agent ran a full audit and returned 1 BLOCKER and 7 HIGH/MEDIUM findings.

**BLOCKER**: the fallback ending condition was `"currentChapter >= 10"`, but campaigns max out at 5 chapters. If a campaign had no defined endings (common in Manual mode), the player reached the final chapter and the EndingView never appeared. Soft-lock.

Fix: added bare `"true"` / `"false"` literal support to `ConditionEvaluator` (it previously only parsed `variable op value`). Fallback ending changed to `condition: "true"` priority 1. It now fires on the last chapter every time.

**HIGH 1**: `buildPacingDirective` returned empty string when `storyBeats` was nil — Manual-mode campaigns got zero pacing guidance. Added a chapter-derived fallback: `currentChapter / totalChapters` ratio maps to SETUP / RISING_ACTION / CLIMAX / RESOLUTION with the same four-act label set.

**HIGH 2**: `checkNPCPersonalEndings` only ran when a main ending fired — NPC arcs that resolved mid-story would never unlock. Moved it to run every turn. Newly-satisfied personal endings emit a `✨ NPCName — Title` system message and `CampaignModeView.onChange(of: resolvedNPCEndings.count)` syncs them into `EndingCollectionManager`.

**HIGH 3**: `SavePoint` didn't persist `gameMode` — save in Duo, load the save, pick Solo, and the session mid-switches modes with the character card left dangling. Added `gameMode` and `characterCardId` fields (both optional, `decodeIfPresent` for legacy saves). When `restoreFromSavePoint?.gameMode` is set, the mode selection view shows a LOCKED badge and disables the toggle.

**MEDIUM**: Export validator warning dialog (empty endings / no NPCs / no key chapters). Ending priority tie-break by type weight (`true_end > good > hidden > bad`). Bad endings require `currentChapter >= 2` so campaigns can't game-over on turn one. `buildNPCSection` prepends a story-phase header ("chapter N/M — early/mid/late") so the DM reads the static `emotionalArc` through current progress, plus lists each NPC's personal endings with conditions so the DM has concrete narrative targets.

Second commit, 10 files, +325/−66.

## Numbers

Today's total:
- **2 commits**, covering P0-P3 + audit fixes
- **36 files**, +4388 lines, −481 lines
- **3 new components** (ImageProcessor, ImageCropperSheet, EndingEditorView)
- Soulbound's P0 / P1 / P2 / P3 all cleared

Workflow was Claude Code-driven as usual. I make decisions (which approach, what trade-offs), it executes (reads code, writes code, runs the build). Today's P0 was the telling one — five attempts to fix the Picker had all failed, and before trying attempt six, Claude laid out five untried diagnostic angles (`fullScreenCover`, `NavigationLink push`, "pure text expression fallback"…). The moment I saw "pure text expression fallback" I realized the whole premise was wrong. I wasn't supposed to fix the Picker. The LLM should generate these conditions directly and the UI should be a plain text expression field.

Sometimes "can't fix it" is the signal that the thing shouldn't exist.

The technical punch list is clear. Next up: simulator golden-path tests and asset prep. But that's tomorrow's problem.
