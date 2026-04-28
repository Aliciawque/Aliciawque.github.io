---
title: "Researching OpenWolf: Steal Two Gears, Skip the Whole Machine"
date: 2026-04-28
tags: ["Claude Code", "Hooks", "DevTools"]
lang: "en"
translationSlug: "claude-code-second-brain"
excerpt: "OpenWolf bills itself as a second brain for Claude Code, 931 stars. Researching it for an hour, I realized 90% of what it does I already have via hooks + memory. But two specific mechanisms were worth stealing: pre-Read injection of file description + token estimate, and bug-fix dedup. I rebuilt them in my own ~/.claude/hooks/ style as two hooks + two CLIs, rolled out to four projects — and mid-write, the new hook fired live in this very session, reminding me README.md still had no description. That's the loop closing in real time."
canvasRender: false
---

## Why I Looked

A friend tossed me a link: [github.com/cytostack/openwolf](https://github.com/cytostack/openwolf). Self-described as "a second brain for Claude Code," 931 stars, all earned in about a month. The kind of tool I might want.

I had Claude pull the README. Six hooks plus a `.wolf/` directory: `anatomy.md` (project file map), `cerebrum.md` (learning memory + Do-Not-Repeat list), `token-ledger.json` (token accounting), `buglog.json` (bug memory), `memory.md` (action log). Claims an average 65.8% token reduction.

The right first instinct when researching an open-source tool is: **how much of this overlaps with what I already have?**

## Overlap Audit

I made the matrix:

| What OpenWolf provides | What I already have |
|---|---|
| 6 project-level hooks | `~/.claude/hooks/` for danger blocking, auto-approve, permission notify, vault lint pre-scan |
| `cerebrum.md` learning memory + Do-Not-Repeat | `~/.claude/projects/-Users-kjm/memory/` auto-memory (user / feedback / project / reference) |
| `memory.md` action log | `claude-mem` plugin |
| Token ledger | `claude-hud` statusline already shows real-time API costs |
| `anatomy.md` file map | **gap** |
| `buglog.json` bug dedup | **gap** |

90% overlap. Installing the whole thing would fight my existing memory governance — `cerebrum.md` and my feedback memories cover the same ground in different formats; the Do-Not-Repeat list is what my feedback memories already do. The token ledger is character-count estimation, while my statusline shows real billed tokens. The `memory.md` action log was for human review, but I never review it.

What's actually new: **`anatomy.md` telling Claude how big a file is and what it does before Reading it**, and **`buglog.json` reminding Claude this exact bug was solved before, here's the fix**.

Installing the whole machine would mean 70% noise for 30% value. Hand-building the 30% is the right move.

## The Two Gears

**Anatomy injection.** Right before Claude calls Read, the hook intercepts and feeds it the matching anatomy row: "📋 anatomy: src/server.ts (~520 tok) — Express HTTP server with middleware chain". Read the same file twice in one session and a second warning fires: "⚡ already read this session, consider using existing knowledge".

**Buglog dedup.** When the user's prompt contains bug-shaped keywords (error / fix / TypeError / throwing / etc.), the hook searches the project's `.claude/buglog.json` first and injects matching past fixes via `additionalContext`.

Both mechanisms share the same shape: **save Claude one redundant action**. The first cuts Read calls, the second cuts re-debugging the same bug from scratch.

## Implementation

Written in my existing hook style, no new dependencies:

- `~/.claude/hooks/anatomy-inject.mjs` — PreToolUse matcher=Read, walks up to find `.claude/anatomy.md`, emits via `hookSpecificOutput.additionalContext`
- `~/.claude/hooks/buglog-search.mjs` — UserPromptSubmit, regex trigger + project-local buglog.json search + top-3 injection
- `~/.claude/bin/anatomy` — `build` / `refresh` (preserves descriptions) / `list` / `path` / `clear`
- `~/.claude/bin/buglog` — `add` (flags or piped JSON) / `search` / `list` / `show` / `rm`

State is project-local: `<project>/.claude/anatomy.md` and `<project>/.claude/buglog.json`. Projects without those files hit the hooks and **silently `exit 0` — zero overhead**. This is something OpenWolf doesn't do — it's globally opt-in; mine is per-project opt-in. Each project decides whether to participate.

Anatomy uses a markdown table, not JSON, so both Claude and I can edit it directly:

```markdown
## src/

| File | Tokens | Description |
|------|-------:|-------------|
| `index.ts` | 180 | Main entry point. Exports createProgram() for CLI. |
| `server.ts` | 520 | Express HTTP server, mounts middleware, listens on PORT. |
```

Token estimation is just `bytes / 4`, same as OpenWolf (±15% accuracy). Good enough.

## Rolling It Out

After writing, I ran 7 smoke tests on a temp fixture — all passed. Then I picked four real projects to seed:

| Project | Files | Description coverage |
|---|---|---|
| Soulbound iOS | 30 | 86% |
| agent-pack-platform | 110 | 40% |
| polylens | 101 | 27% |
| personal-blog (this blog) | 88 | 26% |

The unfilled remainder is tests, boilerplate, and small components that need individual reads to describe well. For the high-value subset, I had Claude batch-read the key files plus parse the project's `CLAUDE.md` (the blog's CLAUDE.md already lists every important file's description, easy to mirror). The rest will get filled lazily — the hook injects "_(no description in anatomy — consider adding one)_" so I'll fix it the next time Claude actually Reads that file.

I embedded two existing feedback rules directly into the relevant file descriptions:

- Soulbound's `CampaignViewModel.swift` description ends with: "NOTE: per feedback_swiftui_navigation, .task in NavigationLink destinations does NOT trigger @Published — use .onChange/onReceive."
- The blog's `CanvasArticle.tsx` description ends with: "IMPORTANT: only render `excerpt` here, NOT full content (per feedback_blog_canvas_text — full content breaks layout)."

Next time Claude touches those files, it sees the rule before it Reads. **The rule travels with the file.** No more leaning on me to repeat the warning.

## The Loop Closing

While drafting this very post, I had Claude read polylens's `README.md` to refresh my memory of the project layout. The instant the Read fired, the just-installed hook spoke up:

> 📋 anatomy: `README.md` (~1,088 tok) — _(no description in anatomy — consider adding one)_

The tool I had just built, in the very session I built it in, started reminding me of work I hadn't finished.

This wasn't a verification demo. The loop genuinely closed.

## A Workflow Worth Keeping

What I want to remember from this:

1. **Don't install first.** Build the matrix. Find the overlap.
2. **Find the 30%.** Whole-tool installs cause friction, but a few specific mechanisms might be a real gap.
3. **Rewrite in your own idiom.** OpenWolf is six hooks plus a global `.wolf/` directory; I rewrote it as two hooks plus per-project `<project>/.claude/`. The intent (pre-Read injection, bug dedup) survived; the packaging adapted to my stack.
4. **Accept that 0% is also a valid answer.** I dropped the token ledger (statusline does it), `cerebrum.md` (memory system does it), `memory.md` (I don't read action logs). Not stinginess — refusing redundancy.

The largest payoff from researching open-source tools is rarely installing them. It's figuring out **which two parts to steal**.

The rest of the machine stays where it is.