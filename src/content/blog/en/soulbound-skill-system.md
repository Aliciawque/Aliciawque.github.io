---
title: "Teaching AI Characters to Learn Skills: Skill System + 11 Native iOS Tools"
date: 2026-04-06
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "en"
translationSlug: "soulbound-skill-system"
excerpt: "Characters can set reminders now, but they don't know when to proactively suggest lunch. Tool Use solved 'can it act' — the Skill system solves 'does it know when to act.' Markdown behavior templates, progressive context injection, character-created skills, plus 11 native iOS tools wiring up Calendar, Reminders, Contacts, HealthKit, Location, and Photos."
canvasRender: false
---

## From "Can Do" to "Knows When"

Last time I built Tool Use — characters could finally set actual reminders and query tasks. But there was a problem: they only acted when told.

You say "remind me to drink water," it sets a reminder. You say "check my schedule," it checks. It never does anything on its own.

That's not an AI companion. That's Siri with a personality skin.

Real proactivity needs two things: **behavioral knowledge** (knowing what to do in which situations) and **system capabilities** (being able to call native iOS features). Today I built both.

## Skills: Markdown Behavior Templates

A Skill is simple: a Markdown document that tells a character what to do, when, and with which tools.

```markdown
---
name: Meal Reminder
description: Remind user to eat at regular meal times
scope: character
triggers: meal, food, hungry, eat, lunch, dinner
capabilities: set_reminder, get_current_time
---

- When the user mentions being hungry or skipping meals, check the current time
- If it's near a meal time (11:30-13:00, 17:30-19:00), set a reminder
- Use a caring tone, don't lecture about nutrition
- If the user says they already ate, acknowledge and move on
```

YAML frontmatter for metadata, Markdown body for behavioral instructions. Users never see the YAML — the editor abstracts it into form fields.

Why Markdown instead of JSON schemas? Because behavioral rules are inherently natural language. "Use a caring tone, don't lecture" can't be structured. Markdown is LLM-friendly and human-friendly.

## Progressive Injection: Don't Waste Tokens

The most important design decision: skill content is NOT dumped entirely into the prompt.

A character might have 10 skills at 300 tokens each. Injecting everything is 3,000 tokens — too expensive for 8K-context local models.

Three-layer progressive strategy:

**Layer 1 — Summary injection.** Each skill gets ~25 tokens in PHI (Post-History Instructions), telling the LLM "you have these skills available." Always present.

```
Available skills:
- Meal Reminder: Remind user to eat at regular meal times [triggers: meal, food, hungry]
- Study Helper: Help with study planning [triggers: study, exam, homework]

If a conversation topic matches a skill, use the activate_skill tool to load its full instructions.
```

**Layer 2 — Keyword auto-activation.** User says "I'm starving" — `SkillManager.matchSkills()` matches the `hungry` trigger, automatically injects the full Meal Reminder body into the current request. Zero extra latency, no LLM decision needed.

**Layer 3 — Tool fallback.** If keywords don't match but the LLM judges from context that a skill is relevant, it can call `activate_skill` (readOnly, needsFollowUp). The LLM gets the full instructions and responds accordingly.

Most conversations only consume Layer 1's ~25 tokens per skill. Full content loads only when the topic matches.

## Character-Created Skills

This is the fun part. Characters don't just use skills — they create them.

`create_skill` is a `requiresConfirmation` writeAction tool. When a character decides a new behavioral pattern would help, it proposes one:

> User: I keep forgetting lunch, too busy working
> Character: (calls create_skill) Want me to set up a lunch reminder skill?
> [Confirmation card: Create skill "Lunch Reminder"? ✓ ✗]

After confirmation, the skill file is written to `Documents/Skills/{characterId}/`, the index updates in UserDefaults, and it takes effect next conversation.

The confirmation flow hit an interesting bug: `ToolRouter.currentCharacterId` is a static var that ChatService clears after processing. But user confirmation is async — by the time they tap, the characterId is nil. Fix: save `pendingCharacterId` when entering `needsConfirmation`, restore it in `confirmToolCalls()`.

## Four-Layer Toggle

Skill activation has four levels of control, coarse to fine:

1. **System toggle** — disable all skills globally
2. **Per-skill toggle** — enable/disable an individual skill
3. **Character override** — a character can turn off a global skill ("Sherlock doesn't need Study Helper")
4. **Character-specific skill** — belongs only to one character

Storage: global skills in `Documents/Skills/global/`, character skills in `Documents/Skills/{characterId}/`. Override mappings in `SkillOverrides_{characterId}` UserDefaults JSON.

The UI reflects all four layers: Settings → Skills manages global, ChatView menu → Skills manages per-character (showing character-specific skills + global override toggles).

## 11 Native iOS Tools

Skills know "what to do." Tools determine "what's possible." I wired up 6 iOS frameworks at once:

| Framework | Tools | Type |
|-----------|-------|------|
| EventKit | `read_calendar`, `create_calendar_event` | Read/Write |
| EventKit | `read_reminders`, `create_apple_reminder` | Read/Write |
| Contacts | `read_contacts` | Read-only |
| HealthKit | `read_health_steps`, `read_health_sleep`, `read_health_heart_rate` | Read-only |
| CoreLocation | `get_location` | Read-only |
| PhotosUI | `pick_photo`, `take_photo` | Interactive |

One Bridge file per framework, all registered into the existing ToolRegistry. Permission checks go through a `NativePermission` helper — denied permissions return a friendly error that the LLM relays to the user.

HealthKit is special: there's no single "Health" permission. Each data type (steps, sleep, heart rate) requires separate authorization. Each health tool requests its specific read permission at execution time.

Location uses `CLLocationManager` + reverse geocoding, returning natural language ("You're in Chaoyang District, Beijing") instead of raw coordinates. The character can naturally say "Oh you're in Chaoyang — there's a nice coffee shop nearby."

## Bug Fix Log

Found four bugs after implementation. All fixed.

**Editor sheet showing empty fields.** SwiftUI's `sheet(isPresented:)` has a classic trap: the sheet content closure captures `@State` at presentation time, but the state may not have propagated yet. Using `.id()` for forced refresh isn't reliable either. Switched to `sheet(item:)` with an Identifiable wrapper — data is packaged directly into the item. Subtle detail: when editing the same skill twice, `item.id` can't reuse `skill.id`, or SwiftUI considers it the same item and skips re-evaluation. Using `UUID()` for fresh ids every time.

**No text response after tool confirmation.** `create_skill` is `requiresConfirmation + writeAction`. The LLM sent only a tool_call with no accompanying text — stripped text was empty. After confirmation, ToolActionCard showed "Created skill: Meal Reminder," but the character said nothing — blank pink bubble. Added `generateToolFollowUp()`: after tool execution, automatically trigger another LLM call for a natural response. The follow-up also goes through `ToolCallParser` cleanup, since ContextEngine injects tool schemas into the system prompt and the LLM might generate `<tool_call>` tags in the follow-up too.

**First message disappearing on new chat.** ChatView's `.task` only calls `loadMessages()`. "Clear & Start New" deletes all messages but doesn't recreate the greeting. Added a check: if messages are empty after loading, auto-generate and save a greeting via `createGreetingMessage()`.

## Numbers

- 21 new files + 6 modified (Skill system + Native Tools)
- 4 bugs found and fixed (sheet stale state, empty follow-up, first message, tool tag leakage)
- 11 native iOS tools across 6 system frameworks
- Three-layer progressive injection, ~25 tokens per idle skill
- Characters no longer just follow orders — they're starting to develop instincts
