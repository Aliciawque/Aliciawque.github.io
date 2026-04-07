---
title: "Redesigning My Obsidian Vault with AI"
date: 2026-04-07
tags: ["AI", "Productivity", "Experience"]
lang: "en"
translationSlug: "obsidian-vault-redesign"
excerpt: "430 files, 74% stale data, 20+ flat folders. I studied Karpathy's LLM Wiki pattern, the Obsidian Mind template, and Graphify's knowledge graph tool, then let Claude Code redesign the entire vault in under an hour. 117 notes, 3-tier structure, 142 knowledge graph nodes."
canvasRender: false
---

## The Problem

My Obsidian vault had been growing for six months. 430 markdown files.

Sounds productive, but only about 110 were actual knowledge notes. The other 308 were conversation archives and identity config files from OpenClaw — a finished AI companion project that left behind a graveyard of context dumps.

The folder structure: 20+ flat directories. Mari, houdini, vex, USD, ds, cop, nuke, katana, ps, ue, SillyTavern, terminal tools, claude code, AI research, gpt, web, workflows, RK900, Vellum, Excalidraw… each with 1 to 23 files.

HOME.md was the only table of contents, manually maintained. Frontmatter was just tags — some notes didn't even have that. Finding things meant searching or remembering.

Time for a redesign.

## Three Sources of Inspiration

I studied three projects, each with a different core philosophy:

### Karpathy's LLM Wiki Pattern

Andrej Karpathy wrote a gist describing a three-layer knowledge management architecture:

1. **Raw sources** — immutable curated documents
2. **The wiki** — LLM-generated and maintained markdown pages with summaries, entity pages, and cross-references
3. **The schema** — a CLAUDE.md file defining wiki structure and workflows

The key insight: LLMs don't get bored maintaining cross-references and consistency across dozens of pages. The bookkeeping work that causes human-maintained wikis to decay becomes structurally manageable.

Humans curate and think strategically. LLMs do the grunt work.

### Obsidian Mind

Brenno Ferrari's vault template, purpose-built for Claude Code. Folders by purpose (work/brain/reference/thinking/), 5 lifecycle hooks, 9 specialized subagents, daily standup/wrap-up workflows.

It's comprehensive, but designed for corporate work — performance tracking, brag docs, 1:1 notes, peer scans. Not what I needed.

What I took: the thinking/ scratchpad (promote or delete within 2 weeks), the template system, and the philosophy of "folders group by purpose, links group by meaning."

### Graphify

An AI knowledge graph generator that transforms code, docs, papers, and images into queryable knowledge graphs. Dual-pass architecture: tree-sitter for deterministic code structure extraction, then Claude subagents in parallel for document concepts. Outputs interactive HTML visualization + JSON + audit reports.

## The Design

Combining ideas from all three, tailored to my situation:

**Directory structure**: Three top-level domains — `3d/` (VFX/3D), `ai/` (LLM/AI development), `dev/` (development tools), each with subdirectories by tool or topic. No deep nesting — two levels max.

**Claude integration**: Karpathy's schema approach. A CLAUDE.md at the vault root defining what goes where, frontmatter rules, naming conventions, ingest workflows, and lint rules. No Obsidian Mind-style auto-classification hooks — keeping manual control.

**Two slash commands**: `/ingest` for processing new content (auto-classify → create note → add cross-references), `/vault-lint` for health checks (orphan notes, missing frontmatter, broken links).

**Knowledge graphs**: Graphify for both the vault itself and project codebases.

## Execution

The entire migration used Claude Code's subagent-driven development mode — dispatching a fresh subagent per task, running independent tasks in parallel.

9 tasks, 8 git commits:

1. **Directory structure** — 18 new subdirectories
2. **Migration script** — Python script to move 120 files
3. **Templates** — knowledge, project, and thinking note templates
4. **CLAUDE.md** — vault schema
5. **Frontmatter standardization** — all 117 files got title/domain/tags/created/status
6. **HOME.md regeneration** — 117 wikilinks, 0 broken
7. **Slash commands** — /ingest and /vault-lint
8. **Graphify** — 142 nodes, 146 edges, 29 communities
9. **Lint and cleanup** — fixed 2 broken links + 1 UTF-8 corruption

The 308 OpenClaw files went to `archive/openclaw-raw/`, out of the way but preserved.

## What Graphify Found

The knowledge graph surfaced some interesting connections:

- **God Nodes**: Terminal Tool Stack Overview (15 edges) and Claude Code (14 edges) were the most connected nodes
- **Cross-domain bridges**: Laplacian operator ↔ Reaction Diffusion — an unexpected bridge between VEX math and Substance procedural texturing
- **Largest communities**: Claude Code Architecture (21 nodes), Terminal Tool Stack (19 nodes), Rendering & Lookdev (17 nodes), Mari Texturing Pipeline (16 nodes)

## After

Adding new notes now looks like this:

```
/ingest <url or content>
```

Claude auto-detects the domain and subdirectory, creates a note from the right template, fills in frontmatter, adds wikilinks, and updates HOME.md when needed.

Periodic `/vault-lint` for health checks, `/graphify .` to update the knowledge graph.

From 430 files of chaos to 117 structured notes with full Claude integration, all in under an hour. That's the value of letting AI do what it does best — bookkeeping.
