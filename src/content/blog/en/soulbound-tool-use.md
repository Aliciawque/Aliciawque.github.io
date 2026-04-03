---
title: "Making AI Characters Actually Do Things: Building a Tool Use System"
date: 2026-04-03
tags: ["iOS", "SwiftUI", "AI", "Architecture"]
lang: "en"
translationSlug: "soulbound-tool-use"
excerpt: "The character says 'Sure, I'll set a reminder for you!' and then nothing happens. That experience is over. I built a dual-track Tool Use system for Soulbound that lets LLM characters actually call iOS notifications, task management, and time queries — supporting native APIs for OpenAI, Anthropic, and Gemini, with a prompt-based fallback for everything else."
canvasRender: false
---

## The Pain Point

Chatting with a character in Soulbound, you say "remind me to drink water in three hours." The character responds earnestly: "Done! I've set the reminder for you~"

But it's lying. Nothing happened. Your phone won't buzz in three hours.

This isn't the LLM's fault — it understood the intent and gave a reasonable response. The problem is the app has no connection layer: LLM output is plain text, and there's a wall between it and iOS notifications, tasks, and calendars.

Today I tore down that wall.

## Dual-Track Protocol: From Talking to Doing

The hardest decision wasn't "should we do Tool Use" but "which protocol."

OpenAI and Anthropic both have native function calling / tool use APIs — structured output, high reliability. But Soulbound's user base includes many people connecting Chinese models (Kimi, GLM, MiniMax, Doubao), and their function calling support is inconsistent.

Final choice: dual-track.

**Native path**: OpenAI/Anthropic/Gemini each use their own `tools` parameter. The LLM returns structured `tool_calls` fields. Parsing is stable.

**Prompt-based fallback**: For models without native API support, inject tool definitions into the system prompt and have the LLM express intent using `<tool_call>{"name":"...","arguments":{...}}</tool_call>` tags in its response. Parse with regex.

`APIConfiguration.toolUseMode` controls the switch: `.auto` mode uses native for OpenAI/Anthropic/Gemini/DeepSeek, prompt-based for `.custom`. Users can manually override.

## Three-Layer Architecture

The entire system splits into three independent components without invading the existing ChatService:

```
ChatService.sendMessage()
    ↓
    LLMService.chatWithTools()  ← inject tool schemas
    ↓
    ToolRouter.process()        ← parse + execute + route
    ↓
    ToolCallParser.parse()      ← dual-track parsing
    ToolRegistry.execute()      ← lookup + execute
```

**ToolRegistry** is the registration center. At app startup, 7 tools are declaratively registered, each with a name, parameter schema, and execution closure. It generates schemas in four formats (OpenAI/Anthropic/Gemini JSON + prompt text). Adding MCP later is just `registry.register()`.

**ToolCallParser** is the dual-track parser. Input is the LLM's raw response + optional native tool_calls JSON. If native exists, use it (also clean any stray `<tool_call>` tags from the response text). Otherwise, regex scan. Parse failure? The entire response becomes plain text — never lose the character's reply.

**ToolRouter** is the orchestration layer. After getting parsed results:
- Plain text → pass through
- writeAction (set reminder, create task) → execute immediately, append confirmation text to response
- readOnly (list tasks, get time) → execute, inject results into context, **call LLM again** so the character responds naturally
- Needs confirmation → return pending, UI shows confirmation card

The readOnly follow-up is the key design. When users ask "what do I have today," the character doesn't mechanically list a table — it gets the task list, then says in its own voice "you've got three things today, don't forget the 2pm meeting~". Costs one extra API call, but the character immersion doesn't break.

## 7 Built-in Tools

| Tool | Type | What It Does |
|------|------|-------------|
| `set_reminder` | writeAction | Calls NotificationService to schedule a timed notification |
| `send_notification` | writeAction | Sends an immediate local notification |
| `create_task` | writeAction | Creates a TodoTask, supports ISO8601 scheduling |
| `complete_task` | writeAction | Fuzzy matches title, marks as done |
| `list_tasks` | readOnly | Filters by today/incomplete/all |
| `get_current_time` | readOnly | Returns current date and time |
| `get_today_tasks` | readOnly | Today's task summary |

`complete_task` uses fuzzy matching instead of IDs — the LLM doesn't know task UUIDs, but it knows the task name the user mentioned. `lowercased().contains()` is good enough.

## Pitfalls

**`@Published` thread safety.** `ChatService` isn't on `@MainActor`, but `pendingToolCalls` is `@Published`. Direct assignment in async functions triggers Swift 6 data race warnings. Fix: wrap assignments in `await MainActor.run {}`, mark confirm/reject as `@MainActor`.

**Anthropic's system role trap.** Follow-up messages initially used `.system` role to inject tool results — on the Anthropic path, all system messages get extracted and concatenated into the top-level `system` field rather than staying in the messages list. This turned tool results into system instructions. Changed to `.user` role with a `[Tool Results]` prefix.

**SwiftUI doesn't auto-observe `@Published`.** Writing `if let pending = chatService.pendingToolCalls` inside the view body doesn't subscribe SwiftUI to changes, because ChatService isn't the view's `@ObservedObject`. Fix: use `onReceive(chatService.$pendingToolCalls)` to drive a `@State` variable.

**Gemini tool_calls format.** Gemini's `functionCall` lives inside parts array elements. When parsing, you need to wrap it with `["functionCall": fc]` to match ToolCallParser's Gemini branch. Miss the outer wrapper and all Gemini tool calls silently vanish.

**Streaming limitations.** `chatStream` returns a plain text chunk stream with no structured `tool_calls` field. So streaming mode can only use prompt-based parsing (scan tags after accumulating the full response). Native tool use requires the non-streaming path. This is an intentional v1 design limitation — no mid-stream tool detection.

## Context Engine Integration

Tool schema injection reuses the existing ContextEngine 7-layer prompt assembly. A new [5.5] layer sits between World Info and PHI:

```
[1] Identity Anchor
[2] Character Card
[3] Assertion Summary
[4] Active Memories
[5] World Info
[5.5] Tool Schema ← new, only injected in prompt-based mode
[6] Chat History
[7] PHI
```

Only injected when `toolUseMode == .promptBased` or `.auto` + `.custom` provider. Native path schemas go through LLMService's `tools` parameter directly — no prompt token cost.

## UI: Transparent but Unobtrusive

Two new UI components, consistent with the existing chat interface style:

**ToolActionCard** — A compact card below the AI bubble showing execution results. Checkmark icon + one line of text, tappable to collapse. Left-aligned (AI side), uses `theme.primary.opacity(0.08)` background, visually consistent with WorldInfoInjectionCard.

**ToolConfirmationCard** — A confirmation card for high-risk operations. None of the current 7 tools require confirmation (future `delete_task` will), but the component is ready. Cancel/Confirm buttons, send button auto-disables during pending state.

ReadOnly queries (checking time, listing tasks) are completely transparent to the user — no visible tool call artifacts, just the character pausing briefly and then answering naturally.

## By the Numbers

- 12 files (6 new + 6 modified)
- 20 unit tests (ToolRegistry 7 + ToolCallParser 7 + ToolRouter 6)
- Two rounds of code review fixed 39 issues (Context Engine 23 + Tool Use 16)
- Supports 5 providers (OpenAI, Anthropic, Gemini, DeepSeek, Custom)
- Characters finally stopped lying
