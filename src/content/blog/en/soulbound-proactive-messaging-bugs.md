---
title: "10 Bugs That Kept My AI Characters From Saying Hello"
date: 2026-04-05
tags: ["iOS", "SwiftUI", "AI", "Debugging"]
lang: "en"
translationSlug: "soulbound-proactive-messaging-bugs"
excerpt: "Wrong tool calls, notifications deleted by cleanup logic, LLM echoing reminder text, silent API failures in closures — 10 bugs fixed in one day to make proactive messaging actually work."
canvasRender: false
---

## Context

Soulbound is an iOS AI character companion app I'm building. The previous round implemented a "proactive messaging" system — characters can send you messages at scheduled times (good morning, reminders, custom messages) via local notifications.

The core system worked, but custom messages had a pile of bugs. Spent a full day hunting them down. Here's every bug, its root cause, and the fix.

## Bug 1: LLM Calls the Wrong Tool

**Symptom**: User says "remind me to drink water," character calls `set_reminder` (one-time delay) instead of `set_proactive_reminder` (recurring custom task).

**Cause**: Tool descriptions were too similar. LLM saw "reminder" and picked the simpler one.

**Fix**: Made descriptions distinct. `set_reminder`: "NOT recurring." `set_proactive_reminder`: "recurring daily/hourly/weekly."

**Lesson**: In prompt-based tool calling, the description IS the selection criteria. Keep it short, make distinctions explicit.

## Bug 2: Custom Messages Show Raw Prompt Hints

**Symptom**: Notification body shows "Say hi to me" (the raw promptHint) instead of LLM-generated character-voice content.

**Cause**: `preGenerateCache()` only generated LLM cache for `.daily` schedule type. `.interval` and `.weekdays` items fell back to raw promptHint.

**Fix**: Remove the `.daily` filter — pre-generate for all schedule types.

## Bug 3: Custom Items Not Editable

**Symptom**: Tapping a custom message row does nothing.

**Fix**: Added `onTapGesture` → edit sheet. But there was a sub-bug —

### Sub-bug: onTapGesture Swallows Toggle

Initially put `.onTapGesture` on the entire row. This intercepted Toggle taps too — tapping the toggle opened the editor instead of toggling. Fix: scope the tap gesture to just the title HStack, leave the Toggle row untouched.

## Bug 4: Notification ID Prefix Collision

**Symptom**: `set_reminder` notifications never fire.

**Cause**: `scheduleAllNotifications()` clears all pending notifications with `proactive-` prefix on app activate. Our `set_reminder` used `proactive-reminder-{uuid}` as the identifier — killed by our own cleanup logic.

**Fix**: Changed prefix to `tool-reminder-`.

**Lesson**: Plan your notification ID namespace. Prefix-based cleanup is a foot-gun if other modules share the prefix.

## Bug 5: Silent Notification Failure in Tool Closures

**Symptom**: `set_reminder` execute closure calls `UNUserNotificationCenter.current().add(request)` — returns successfully, but notification never appears.

**Cause**: Tool execute closures run in async contexts. The `UNUserNotificationCenter.current()` instance obtained there may differ from the one `NotificationService` singleton holds, or the delegate isn't set up.

**Fix**: Use `NotificationService.shared.scheduleNotification()` — singleton initialized on main thread with proper delegate.

**Lesson**: iOS notification APIs are "thread-safe" per docs, but in practice, going through a pre-configured singleton is more reliable. This was the hardest bug to find — zero error logs, notifications just silently vanish.

## Bug 6: LLM Echoes Proactive Message Content

**Symptom**: User asks "remind me to sleep," character's response ends with "Say hi to me" appended.

**Cause**: Proactive messages (like "Say hi to me") were saved as assistant messages in the chat DB. When building LLM context, these appeared as conversation history. DeepSeek treated them as a pattern to mimic.

**Fix**: Filter messages with `metadata["source"] == "proactive"` from all `getMessages` calls in ChatService. Messages remain visible in chat UI but don't enter LLM context.

**Lesson**: Anything stored in chat history that isn't actual conversation WILL confuse the LLM. Tag it with metadata and filter on query.

## Bug 7: Missing Tool Schema in Memory Path

**Symptom**: Tools sometimes not called at all.

**Cause**: ChatService has three context-building paths: ContextEngine / ChatMemorySystem / Legacy. Only ContextEngine injected the tool schema. If the ChatMemorySystem path was taken, the LLM had zero knowledge of available tools.

**Fix**: Inject `toolRouter.registry.schemaForPromptInjection()` in all three paths.

## Bug 8: Verbose Tool Descriptions Break Prompt-Based Calling

**Symptom**: After changing tool descriptions, DeepSeek stops calling any tools.

**Cause**: DeepSeek in streaming mode only supports prompt-based tool calling (`<tool_call>` tags). Expanding one-line descriptions into multi-line detailed instructions confused the LLM enough to stop generating tool_call tags entirely.

**Fix**: Keep descriptions to one line. Restore original template format (two examples, "EXACTLY this format" wording).

**Lesson**: Prompt-based tool calling is extremely format-sensitive. "More detail" ≠ "better." Test before and after any prompt change.

## Bug 9: writeAction displayText Exposed to Users

**Symptom**: When LLM generates only a tool call with no text, users see raw English text: "Set a one-time reminder for 1 minutes from now: 刷牙. Note: this is a one-time reminder..."

**Cause**: `writeAction` displayText is shown directly as fallback when LLM produces no accompanying text. We put LLM-facing instructions in displayText.

**Fix**: Changed `set_reminder` to `readOnly` result type so tool results go back to LLM for natural language response. Keep displayText concise.

## Bug 10: Hardcoded Cache Key Prefix

**Symptom**: AppCoordinator's `set_proactive_reminder` tool handler hardcodes `"proactive-cache-"` prefix for cache writes.

**Cause**: This matched `ProactiveMessagingService.cacheKeyPrefix` by coincidence. If the service's prefix changes, cache breaks silently.

**Fix**: Added public `ProactiveMessagingService.writeCache()` method to centralize key management.

## Takeaways

10 bugs, three categories:

1. **Namespace collisions** (Bug 4, 10) — different modules using the same prefix/key format
2. **LLM context pollution** (Bug 1, 2, 6, 7, 8) — everything in the prompt directly affects LLM behavior
3. **iOS runtime surprises** (Bug 5, 9) — "thread-safe" in docs ≠ works in every execution context

Hardest to find: Bug 5 (silent failure, no logs) and Bug 6 (requires understanding why the LLM mimics specific content). Easiest: Bug 3 (pure UI change).

None of these bugs are individually complex. But they interleave — fixing one exposes another, or introduces a new one. The key is reviewing after each fix, not batching tests.
